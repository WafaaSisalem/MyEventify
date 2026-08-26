import { HttpError, UnauthorizedError } from '../errors/http-error.ts';
import { hashPassword, verifyPassword, generateRefreshToken } from './auth.utils.ts';
import * as authRepo from './auth.repository.ts';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import crypto from 'node:crypto';

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
  const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const storedToken = await authRepo.findRefreshToken(hashedRefreshToken);

  if (!storedToken) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Delete the old token immediately (consumed/rotated)
  await authRepo.deleteRefreshToken(hashedRefreshToken);

  // Check expiration
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Issue new access token
  const accessToken = jwt.sign(
    { sub: storedToken.user.id, role: storedToken.user.role },
    config.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );

  // Issue new refresh token
  const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

  await authRepo.storeRefreshToken(tokenHash, storedToken.user.id, expiresAt);

  return { accessToken, refreshToken: rawToken };
}

