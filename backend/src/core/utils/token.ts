import { createHash, randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(40).toString('hex');
  return { raw, hash: hashToken(raw) };
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function toKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT with HS256.
 *
 * @param sub     - Subject (typically user ID)
 * @param payload - Additional claims to embed
 * @param secret  - HMAC secret
 * @param expiresIn - Expiry string understood by jose (e.g. "15m", "7d")
 */
export async function signJwt(
  sub: string,
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(toKey(secret));
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws a JWTVerificationError (jose) on failure — callers should catch it.
 */
export async function verifyJwt<T = Record<string, unknown>>(
  token: string,
  secret: string
): Promise<T> {
  const { payload } = await jwtVerify(token, toKey(secret));
  return payload as T;
}
