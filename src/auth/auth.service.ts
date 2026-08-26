import { HttpError, UnauthorizedError } from '../errors/http-error.ts';
import { hashPassword, verifyPassword } from './auth.utils.ts';
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

  const rawRefreshToken = crypto.randomBytes(32).toString('base64url');
  const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await authRepo.storeRefreshToken(hashedRefreshToken, user.id, expiresAt);

  return { accessToken, refreshToken: rawRefreshToken };
}
