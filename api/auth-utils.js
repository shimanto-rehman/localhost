import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'localhost-dev-secret-change-me';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_PASSWORD = '1234';

export function hashPassword(password) {
  return crypto.createHash('sha256').update(`${SECRET}:${password}`).digest('hex');
}

export function verifyPassword(password, hash) {
  if (!hash) return false;
  return hashPassword(password) === hash;
}

export function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function ensureSessions(data) {
  if (!data.sessions) data.sessions = {};
  return data.sessions;
}

export function createSession(data, memberId) {
  const sessions = ensureSessions(data);
  const token = createToken();
  sessions[token] = {
    memberId,
    expires: new Date(Date.now() + SESSION_MS).toISOString()
  };
  return token;
}

export function validateSession(data, token) {
  if (!token || !data?.sessions?.[token]) return null;
  const session = data.sessions[token];
  if (new Date(session.expires) < new Date()) {
    delete data.sessions[token];
    return null;
  }
  return session;
}

export function revokeSession(data, token) {
  if (token && data?.sessions?.[token]) delete data.sessions[token];
}

export function getMemberRoles(data, memberId) {
  return {
    isAdmin: data.config?.adminId === memberId,
    isBillManager: data.config?.billManagerId === memberId
  };
}

export function sanitizeForClient(data) {
  const copy = JSON.parse(JSON.stringify(data));
  delete copy.sessions;
  if (copy.members) {
    copy.members = copy.members.map(({ passwordHash, ...m }) => m);
  }
  return copy;
}

export function ensureMemberPasswords(data) {
  data.members.forEach(m => {
    if (!m.passwordHash) m.passwordHash = hashPassword(DEFAULT_PASSWORD);
  });
  if (!data.config.adminId && data.members.length) {
    data.config.adminId = data.members[0].id;
  }
  if (!data.config.billManagerId && data.members.length) {
    data.config.billManagerId = data.members[0].id;
  }
  return data;
}

export function mergeMembersPreservingPasswords(existingMembers, incomingMembers) {
  return incomingMembers.map(m => {
    const prev = existingMembers.find(x => x.id === m.id);
    return {
      ...m,
      passwordHash: prev?.passwordHash || hashPassword(DEFAULT_PASSWORD)
    };
  });
}

export function requireSession(data, token) {
  const session = validateSession(data, token);
  if (!session) {
    const err = new Error('Please sign in to continue');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }
  return session;
}

export function requireAdmin(data, token) {
  const session = requireSession(data, token);
  if (data.config?.adminId !== session.memberId) {
    const err = new Error('Admin access required');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return session;
}

export function requireBillManager(data, token) {
  const session = requireSession(data, token);
  if (data.config?.billManagerId !== session.memberId) {
    const err = new Error('Bill Manager access required');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return session;
}

export function requireAdminOrBillManager(data, token) {
  const session = requireSession(data, token);
  const roles = getMemberRoles(data, session.memberId);
  if (!roles.isAdmin && !roles.isBillManager) {
    const err = new Error('Admin or Bill Manager access required');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return session;
}
