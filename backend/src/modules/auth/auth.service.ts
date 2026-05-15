import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../prisma/client.js';
import env from '../../core/config/env.js';
import { createLogger } from '../../core/utils/logger.js';
import { hashToken, generateToken, signJwt } from '../../core/utils/token.js';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
} from '../../core/errors/AppError.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const log = createLogger('AuthService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function refreshExpiry(): Date {
  return new Date(
    Date.now() + env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
  );
}

function signAccessToken(
  sub: string,
  email: string,
  role: string
): Promise<string> {
  return signJwt(
    sub,
    { email, role },
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRES_IN
  );
}

/** Shared select shape for safe user responses — never includes passwordHash */
const safeUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
} as const;

/** Issues a fresh access + refresh token pair for a user */
async function issueTokens(userId: string, email: string, role: string) {
  const accessToken = await signAccessToken(userId, email, role);
  const { raw, hash } = generateToken();

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hash, expiresAt: refreshExpiry() },
  });

  return { accessToken, refreshToken: raw };
}

// ─── Auth operations ──────────────────────────────────────────────────────────

async function register(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    const field = existing.email === input.email ? 'email' : 'username';
    throw new ConflictError(`This ${field} is already taken`);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  // Create user and its LOCAL provider atomically
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
      },
      select: safeUserSelect,
    });

    await tx.userProvider.create({
      data: { userId: created.id, provider: 'LOCAL', providerId: created.id },
    });

    return created;
  });

  log.info({ userId: user.id }, 'User registered');

  const tokens = await issueTokens(user.id, user.email, user.role);
  return { user, ...tokens };
}

async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...safeUserSelect, passwordHash: true },
  });

  // Always run bcrypt even when user is not found — prevents timing attacks
  // that would let an attacker enumerate existing emails.
  const dummyHash =
    '$2a$12$dummyhashfortimingprotectionXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const valid = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? dummyHash
  );

  // Reject if user not found, has no passwordHash (social-only account), or wrong password
  if (!user || !user.passwordHash || !valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  log.info({ userId: user.id }, 'User logged in');

  const { passwordHash: _, ...safeUser } = user;
  const tokens = await issueTokens(user.id, user.email, user.role);
  return { user: safeUser, ...tokens };
}

async function refresh(rawToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { select: { id: true, email: true, role: true } } },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Rotate: revoke old token, issue a fresh one atomically
  const { raw, hash } = generateToken();

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: hash,
        expiresAt: refreshExpiry(),
      },
    }),
  ]);

  const accessToken = await signAccessToken(
    stored.user.id,
    stored.user.email,
    stored.user.role
  );
  return { accessToken, refreshToken: raw };
}

async function logout(rawToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── Social auth ──────────────────────────────────────────────────────────────

/**
 * Derives a URL-safe username candidate from an email address.
 * e.g. "john.doe+tag@gmail.com" → "johndoe"
 */
function usernameFromEmail(email: string): string {
  const [prefix = ''] = email.split('@');
  return prefix
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
    .slice(0, 24);
}

/**
 * Finds a unique username by appending a random suffix if the base is taken.
 */
async function resolveUniqueUsername(base: string): Promise<string> {
  let candidate = base || 'user';

  while (true) {
    const taken = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base}${randomBytes(3).toString('hex')}`;
  }
}

async function googleLogin(idToken: string) {
  // Verify the ID token against Google's public keys
  const ticket = await googleClient
    .verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    .catch(() => {
      throw new BadRequestError('Invalid Google ID token');
    });

  const payload = ticket.getPayload();
  if (!payload?.email) throw new BadRequestError('Google account has no email');

  const { email, name, picture, email_verified, sub: googleSub } = payload;

  // 1. Known Google identity → just log in
  const existingProvider = await prisma.userProvider.findUnique({
    where: {
      provider_providerId: { provider: 'GOOGLE', providerId: googleSub },
    },
    include: { user: { select: safeUserSelect } },
  });

  if (existingProvider) {
    log.info({ userId: existingProvider.user.id }, 'User logged in via Google');
    const tokens = await issueTokens(
      existingProvider.user.id,
      existingProvider.user.email,
      existingProvider.user.role
    );
    return { user: existingProvider.user, ...tokens };
  }

  const emailTaken = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (emailTaken) {
    throw new ConflictError(
      'An account with this email already exists. Please log in with your password.'
    );
  }

  // 3. Brand new user → create account + Google provider atomically
  const username = await resolveUniqueUsername(usernameFromEmail(email));

  const newUser = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        username,
        displayName: name ?? username,
        avatarUrl: picture ?? null,
        emailVerifiedAt: email_verified ? new Date() : null,
      },
      select: safeUserSelect,
    });

    await tx.userProvider.create({
      data: { userId: created.id, provider: 'GOOGLE', providerId: googleSub },
    });

    return created;
  });

  log.info({ userId: newUser.id }, 'User registered via Google');
  const tokens = await issueTokens(newUser.id, newUser.email, newUser.role);
  return { user: newUser, ...tokens };
}

async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });
}

export const authService = {
  register,
  login,
  refresh,
  logout,
  googleLogin,
  getMe,
};
