import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';

// First account registered with this email is auto-promoted to admin,
// matching the previous Firebase bootstrap behaviour. Override via env.
export const ADMIN_BOOTSTRAP_EMAIL = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'zahidyaftali999@gmail.com').toLowerCase();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const TOKEN_TTL = '30d';

export interface AuthTokenPayload {
  uid: string;
  email: string;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: AuthTokenPayload;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string | null): boolean {
  if (!hash) return false;
  return bcrypt.compareSync(plain, hash);
}

function readToken(req: Request): AuthTokenPayload | null {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid token is present; never rejects. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const payload = readToken(req);
  if (payload) req.user = payload;
  next();
}

/** Rejects with 401 unless a valid token is present. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const payload = readToken(req);
  if (!payload) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }
  req.user = payload;
  next();
}

/** Rejects unless the token belongs to an admin. */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const payload = readToken(req);
  if (!payload) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }
  if (payload.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  req.user = payload;
  next();
}

/** Rejects unless the token belongs to one of the given roles. */
export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const payload = readToken(req);
    if (!payload) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    if (!roles.includes(payload.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    req.user = payload;
    next();
  };
}

/** True when the request is by the given user themself or an admin. */
export function isSelfOrAdmin(req: AuthedRequest, uid: string): boolean {
  return !!req.user && (req.user.uid === uid || req.user.role === 'admin');
}
