import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ROLES, type AuthContext, type Role } from '../types/domain.js';
import { unauthorized } from '../types/errors.js';

interface TokenClaims {
  sub: string;
  clubId: string;
  role: Role;
}

export function signToken(auth: AuthContext): string {
  const claims: TokenClaims = { sub: auth.userId, clubId: auth.clubId, role: auth.role };
  return jwt.sign(claims, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/** Verifies signature, expiry and claim shape; throws a 401 AppError otherwise. */
export function verifyToken(token: string): AuthContext {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw unauthorized('Invalid or expired token');
  }
  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    typeof payload.clubId !== 'string' ||
    !ROLES.includes(payload.role)
  ) {
    throw unauthorized('Invalid token claims');
  }
  return { userId: payload.sub, clubId: payload.clubId, role: payload.role as Role };
}
