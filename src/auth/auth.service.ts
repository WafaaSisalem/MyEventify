import { HttpError, UnauthorizedError } from '../errors/http-error.ts';
import { hashPassword, verifyPassword, generateRefreshToken, sha256 } from './auth.utils.ts';
import * as authRepo from './auth.repository.ts';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';

export async function signup(email: string, password: string, name: string) {
  const existingUser = await authRepo.findByEmail(email);

  if (existingUser) {
    throw new HttpError(409, 'Unable to create account');
  }

  const hashedPassword = await hashPassword(password);

  const user = await authRepo.create({
    email,
    password: hashedPassword,
    name,
  });

  return user;
}

export async function login(email: string, password: string) {
  const user = await authRepo.findByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await verifyPassword(user.password, password);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    config.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );

  const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

  await authRepo.storeRefreshToken(tokenHash, user.id, expiresAt);

  return { accessToken, refreshToken: rawToken };
}

export async function refresh(rawRefreshToken: string) {
  const oldTokenHash = sha256(rawRefreshToken);
  const storedToken = await authRepo.findRefreshToken(oldTokenHash);

  if (!storedToken) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Check if token was already revoked (Reuse / Theft signal)
  if (storedToken.revokedAt) {
    // STRETCH: We could revoke the entire family here by tracing replacedById.
    // For now, we just deny the request.
    throw new UnauthorizedError('Refresh token has been revoked');
  }

  // Check expiration
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Issue new tokens
  const accessToken = jwt.sign(
    { sub: storedToken.user.id, role: storedToken.user.role },
    config.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );

  const { rawToken, tokenHash: newTokenHash, expiresAt } = generateRefreshToken();

  // Atomically revoke the old token and store the new one
  await authRepo.rotateRefreshToken(
    oldTokenHash,
    newTokenHash,
    storedToken.user.id,
    expiresAt
  );

  return { accessToken, refreshToken: rawToken };
}

