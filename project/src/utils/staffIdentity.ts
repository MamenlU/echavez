export type StaffRole = 'cashier' | 'admin' | 'super_admin';

export function staffRoleLabel(role?: string | null): string {
  switch (role) {
    case 'cashier': return 'Cashier';
    case 'admin': return 'Admin';
    case 'super_admin': return 'Super Admin';
    default: return 'Staff';
  }
}

export function staffIdentity(name?: string | null, role?: string | null, id?: number | null): string {
  const safeName = name?.trim() || (id ? `Staff #${id}` : 'Staff member');
  return `${safeName} · ${staffRoleLabel(role)}`;
}

export function approvalDescription(approval?: {
  status?: string | null;
  name?: string | null;
  role?: string | null;
} | null): string {
  if (!approval) return 'No approval record available';
  if (approval.status === 'self_reauthenticated') return 'Super Admin · Fresh reauthentication';
  if (approval.status === 'not_required') return 'Not required';
  if (approval.status === 'approved') {
    return approval.name ? staffIdentity(approval.name, approval.role) : 'Approved · Staff record unavailable';
  }
  return 'No verified approval recorded';
}
