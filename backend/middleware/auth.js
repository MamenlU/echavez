import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pool from '../db.js';

/** Verify a signed session, without changing the existing Customer API semantics. */
export function authenticateToken(req, res, next) {
  const [scheme, token, extra] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token || extra) return res.status(401).json({ error: 'Authentication required.' });
  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'Server authentication configuration error.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const id = Number(payload?.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    req.user = { id, username: payload.username, role: payload.role };
    return next();
  } catch (error) {
    return res.status(401).json({ error: error.name === 'TokenExpiredError'
      ? 'Your session has expired. Please log in again.' : 'Invalid authentication token.' });
  }
}

/** Check account activation and current role on customer-facing authenticated APIs too.
 * Staff endpoints already use requireRoles; this prevents stale Customer JWTs
 * from continuing to operate after account deactivation or role changes.
 */
export function createCurrentAccountGuard(database = pool) {
  return async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const [rows] = await database.query('SELECT id, username, role, status FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const account = rows[0];
    if (!account || account.status !== 'active') {
      return res.status(401).json({ error: 'Your account is inactive or no longer available.' });
    }
    req.user = { id: Number(account.id), username: account.username, role: account.role };
    return next();
  } catch (err) {
    console.error('Current session verification failed:', err);
    return res.status(503).json({ error: 'Unable to verify account status.' });
  }
  };
}
export const requireCurrentAccount = createCurrentAccountGuard();

/** Privileged permissions use the current database role/status, not the JWT claim. */
export const requireRoles = (...roles) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, status FROM users WHERE id = ? LIMIT 1', [req.user.id]
    );
    const user = rows[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Account inactive or no longer available. Please log in again.' });
    }
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Insufficient account permissions.' });
    req.user = { id: Number(user.id), username: user.username, role: user.role };
    return next();
  } catch (error) {
    console.error('Authorization database check failed:', error);
    return res.status(503).json({ error: 'Unable to verify account permissions.' });
  }
};

// Signed Cashier sessions are restricted to assigned POS and shift APIs.
// Existing Customer/Admin endpoints retain their original request semantics.
export function denyCashierRole(req, res, next) {
  if (req.user?.role === 'cashier') {
    return res.status(403).json({ error: 'Cashier access is limited to POS operations.' });
  }
  return next();
}


export const requireAdmin = requireRoles('admin', 'super_admin');
export const requireSuperAdmin = requireRoles('super_admin');
export const requirePosStaff = requireRoles('admin', 'cashier', 'super_admin');

// Approval policy is action-specific; authorization is enforced on the API.
// Admin is not implicitly equivalent to Super Admin for financial operations.
export const APPROVAL_POLICIES = Object.freeze({
  shift_open: { cashier: ['admin', 'super_admin'], admin: ['super_admin'], super_admin: ['super_admin'] },
  shift_close: { cashier: ['admin', 'super_admin'], admin: ['super_admin'], super_admin: ['super_admin'] },
  sale_adjustment: { cashier: ['admin', 'super_admin'], admin: ['super_admin'], super_admin: ['super_admin'] },
  cash_drawer_expense: { admin: ['super_admin'], super_admin: ['super_admin'] },
  expense_void: { admin: ['super_admin'], super_admin: ['super_admin'] },
});

// Defense-in-depth on each instance. For internet-scale production, configure
// distributed rate-limiting at the API gateway/WAF as well.
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_ATTEMPT_ENTRIES = 5000;

// Approval credentials never enter the transaction or its persisted audit details.
// Only approval ID, role and action are retained. A Super Admin may reauthenticate
// their *own* restricted transaction; all delegated approvals require a different actor.
export function requireActionApproval(action) {
  if (!APPROVAL_POLICIES[action]) throw new Error(`Unknown approval policy: ${action}`);
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const eligibleRoles = APPROVAL_POLICIES[action][req.user.role];
    if (eligibleRoles === undefined) return next(); // routine Admin/Super Admin operation
    if (!eligibleRoles.length) return res.status(403).json({ error: 'Permission denied.' });
    const username = typeof req.body?.managerUsername === 'string' ? req.body.managerUsername.trim() : '';
    const password = typeof req.body?.managerPassword === 'string' ? req.body.managerPassword : '';
    const key = `${req.user.id}:${String(req.ip || '').slice(0, 80)}`;
    const now = Date.now();
    const entry = attempts.get(key);
    if (entry && entry.resetAt > now && entry.failures >= MAX_FAILURES) {
      return res.status(429).json({ error: 'Too many verification attempts.' });
    }
    const reject = async (reason) => {
      if (attempts.size >= MAX_ATTEMPT_ENTRIES) {
        for (const [k, value] of attempts) if (value.resetAt < now) attempts.delete(k);
        while (attempts.size >= MAX_ATTEMPT_ENTRIES) attempts.delete(attempts.keys().next().value);
      }
      const failure = entry && entry.resetAt > now ? entry.failures + 1 : 1;
      attempts.set(key, { failures: failure, resetAt: now + WINDOW_MS });
      try {
        const { recordAuditLog } = await import('../lib/auditService.js');
        await recordAuditLog(pool, {
          adminId: req.user.id, actorRole: req.user.role,
          action: 'approval.rejected', entityType: 'authorization',
          summary: `Rejected ${action} verification.`,
          after: { action, status: 'rejected', operator_role: req.user.role,
            attempted_approver_username: username.slice(0, 100), failure_reason: reason },
        });
      } catch (err) {
        console.error('Unable to persist approval rejection:', err);
        return res.status(503).json({ error: 'Unable to record rejected approval.' });
      }
      return res.status(403).json({ error: 'Authorized approver verification required or failed.' });
    };
    if (!username || username.length > 100 || !password || password.length > 256) {
      return reject('missing_credentials');
    }
    try {
      const [rows] = await pool.query(
        `SELECT id, username, role, status, password_hash FROM users
         WHERE username = ? OR email = ? LIMIT 1`, [username, username]
      );
      const approver = rows[0];
      const fallback = '$2b$12$8okEw2KVXmH8UEBbh0OMTOhh8TtVfKdN5V2QCIoIXz.T1rtH1hvQ.';
      const valid = await bcrypt.compare(password, approver?.password_hash || fallback);
      const sameAccount = Number(approver?.id) === req.user.id;
      const selfStepUp = req.user.role === 'super_admin' && sameAccount && approver?.role === 'super_admin';
      if (!approver || !eligibleRoles.includes(approver.role) || approver.status !== 'active'
        || !approver.password_hash || !valid || (sameAccount && !selfStepUp)) {
        return reject('credentials_or_role_invalid');
      }
      attempts.delete(key);
      req.managerApproval = { id: Number(approver.id), username: approver.username,
        role: approver.role, action, status: 'approved', self_step_up: selfStepUp };
      return next();
    } catch (error) {
      console.error('Approval verification error:', error);
      return res.status(503).json({ error: 'Approval verification is temporarily unavailable.' });
    }
  };
}

// Preserve the established import name for any external integration;
// all cashier adjustment routes now call the explicit action-specific policy.
export const requireManagerForCashier = requireActionApproval('sale_adjustment');
