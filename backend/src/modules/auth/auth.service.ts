import bcrypt from 'bcryptjs';
import prisma from '../../prisma/client.js';
import env from '../../core/config/env.js';
import { createLogger } from '../../core/utils/logger.js';
import { hashToken, generateToken, signJwt } from '../../core/utils/token.js';
import {
  ConflictError,
  UnauthorizedError,
} from '../../core/errors/AppError.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

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

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });

  log.info({ userId: user.id }, 'User registered');

  const accessToken = await signAccessToken(user.id, user.email, user.role);
  const { raw, hash } = generateToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: refreshExpiry() },
  });

  return { user, accessToken, refreshToken: raw };
}

async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  // Always run bcrypt even when user is not found — prevents timing attacks
  // that would let an attacker enumerate existing emails.
  const dummyHash =
    '$2a$12$dummyhashfortimingprotectionXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const valid = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? dummyHash
  );

  if (!user || !valid) throw new UnauthorizedError('Invalid email or password');

  log.info({ userId: user.id }, 'User logged in');

  const { passwordHash: _, ...safeUser } = user;

  const accessToken = await signAccessToken(user.id, user.email, user.role);
  const { raw, hash } = generateToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: refreshExpiry() },
  });

  return { user: safeUser, accessToken, refreshToken: raw };
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

async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });
}

export const authService = { register, login, refresh, logout, getMe };
