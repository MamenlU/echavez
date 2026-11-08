/** Read-only role/identity projection for staff audit history. Audit rows are never mutated. */
export function parseAuditJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : null; }
  catch { return null; }
}

export function auditActorRole(after, currentRole) {
  const snapshot = after?.actor_role_at_action || after?.operator_role || after?.actor_role || after?.staff_role;
  if (['cashier', 'admin', 'super_admin'].includes(snapshot)) {
    return { role: snapshot, role_source: 'at_action' };
  }
  return { role: currentRole || null, role_source: 'current_account' };
}

export function getApprovedStaffId(after) {
  // Unsuccessful verifications must never be treated as authorized approvals.
  if (after?.approval?.status === 'approved') {
    const id = Number(after.approval.id);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }
  // Legacy explicitly recorded manager attribution for older completed actions.
  if (after?.approval == null && after?.approved_by_manager_id != null) {
    const id = Number(after.approved_by_manager_id);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }
  return null;
}

export function makeAuditEntry(row, staffById = new Map()) {
  const before = parseAuditJson(row.before_data);
  const after = parseAuditJson(row.after_data);
  const actor = auditActorRole(after, row.admin_role);
  const id = getApprovedStaffId(after);
  const approver = id === null ? null : staffById.get(id) || null;
  const selfStepUp = Boolean(after?.approval?.self_step_up);
  const approvalStatus = row.action === 'approval.rejected' ? 'verification_failed'
    : after?.approval?.status === 'approved' ? (selfStepUp ? 'self_reauthenticated' : 'approved')
      : (after?.approval?.status || 'not_recorded');
  return {
    ...row, before_data: before, after_data: after,
    actor_name: row.admin_name || row.admin_username || `Staff #${row.admin_id}`,
    actor_username: row.admin_username || null,
    actor_role: actor.role, actor_role_source: actor.role_source,
    approval_status: approvalStatus,
    approved_by: approver ? { id: Number(approver.id), name: approver.name,
      username: approver.username, role: after?.approval?.role || approver.role,
      role_source: after?.approval?.role ? 'at_action' : 'current_account' } : null,
  };
}

/** Resolve approver identities by safe primary key; never by untrusted usernames. */
export async function decorateAuditRows(db, rows) {
  const ids = Array.from(new Set(rows.map(row => getApprovedStaffId(parseAuditJson(row.after_data))).filter(Boolean)));
  const staffById = new Map();
  if (ids.length) {
    const [staff] = await db.query(
      `SELECT id, username, role, CONCAT_WS(' ', first_name, last_name) AS name
       FROM users WHERE id IN (?)`, [ids]
    );
    staff.forEach(member => staffById.set(Number(member.id), member));
  }
  return rows.map(row => makeAuditEntry(row, staffById));
}

/** Shift audit metadata is copied for display only, not financial mutation. */
export async function enrichShiftApprovals(db, shifts) {
  if (!shifts.length) return shifts;
  const ids = shifts.map(shift => String(shift.shift_id));
  const [events] = await db.query(
    `SELECT al.entity_id, al.action, al.after_data
     FROM audit_logs al
     WHERE al.entity_type = 'cashier_shift'
       AND al.action IN ('cash_shift.open', 'cash_shift.close')
       AND al.entity_id IN (?)
     ORDER BY al.audit_id DESC`, [ids]
  );
  const eventByShift = new Map();
  const approverIds = new Set();
  for (const event of events) {
    const id = String(event.entity_id);
    const entry = eventByShift.get(id) || {};
    const phase = event.action === 'cash_shift.open' ? 'opening' : 'closing';
    if (entry[phase]) continue;
    const after = parseAuditJson(event.after_data);
    const approverId = getApprovedStaffId(after);
    if (approverId) approverIds.add(approverId);
    entry[phase] = { approverId, selfStepUp: Boolean(after?.approval?.self_step_up),
      approverRoleAtAction: after?.approval?.role || null,
      ownerRoleAtAction: after?.actor_role_at_action || after?.operator_role || null,
      status: after?.approval?.status || 'not_recorded' };
    eventByShift.set(id, entry);
  }
  const staffById = new Map();
  if (approverIds.size) {
    const [users] = await db.query(
      `SELECT id, username, role, CONCAT_WS(' ', first_name, last_name) AS name
       FROM users WHERE id IN (?)`, [Array.from(approverIds)]
    );
    users.forEach(u => staffById.set(Number(u.id), u));
  }
  const approvalDetails = detail => {
    if (!detail) return null;
    const staff = staffById.get(detail.approverId);
    return { status: detail.selfStepUp ? 'self_reauthenticated' : detail.status,
      id: detail.approverId || null,
      name: staff ? (staff.name || staff.username) : null,
      role: detail.approverRoleAtAction || staff?.role || null,
    };
  };
  return shifts.map(shift => {
    const record = eventByShift.get(String(shift.shift_id)) || {};
    return { ...shift,
      shift_owner_role: record.opening?.ownerRoleAtAction || shift.shift_owner_role || null,
      opening_approval: approvalDetails(record.opening),
      closing_approval: approvalDetails(record.closing) };
  });
}

/** Add verified authorization metadata to read-only return/void history. */
export async function enrichAdjustmentApprovals(db, adjustments) {
  if (!adjustments.length) return adjustments;
  const ids = adjustments.map(row => String(row.adjustment_id));
  const [events] = await db.query(
    `SELECT al.entity_id, al.after_data FROM audit_logs al
     WHERE al.entity_type = 'sale_adjustment'
       AND al.action IN ('sale.return', 'sale.void')
       AND al.entity_id IN (?) ORDER BY al.audit_id DESC`, [ids]
  );
  const records = new Map();
  const approverIds = new Set();
  for (const event of events) {
    const key = String(event.entity_id);
    if (records.has(key)) continue;
    const after = parseAuditJson(event.after_data);
    const id = getApprovedStaffId(after);
    if (id) approverIds.add(id);
    records.set(key, {id, roleAtAction: after?.approval?.role || null,
      processorRoleAtAction: after?.actor_role_at_action || after?.operator_role || null,
      status: after?.approval?.self_step_up ? 'self_reauthenticated' : after?.approval?.status || 'not_recorded'});
  }
  const byId = new Map();
  if (approverIds.size) {
    const [staff] = await db.query(
      `SELECT id, username, role, CONCAT_WS(' ', first_name, last_name) AS name
       FROM users WHERE id IN (?)`, [Array.from(approverIds)]
    );
    staff.forEach(member => byId.set(Number(member.id), member));
  }
  return adjustments.map(row => {
    const record = records.get(String(row.adjustment_id));
    const approver = record?.id ? byId.get(record.id) : null;
    return {
      ...row,
      processed_by_role: record?.processorRoleAtAction || row.processed_by_role || null,
      approval: record ? {
        status: record.status,
        id: record.id || null,
        name: approver ? approver.name || approver.username : null,
        role: record.roleAtAction || approver?.role || null,
      } : null,
    };
  });
}
