import type { Request, Response } from 'express';
import { signup, login, refresh } from './auth.service.ts';
import { UnauthorizedError } from '../errors/http-error.ts';

export async function signupHandler(req: Request, res: Response) {
  const { email, password, name } = req.body;

  const user = await signup(email, password, name);

  res.status(201).json(user);
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;
  const { accessToken, refreshToken } = await login(email, password);

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/v1/auth/refresh',
  });

  res.json({ accessToken });
}

export async function refreshHandler(req: Request, res: Response) {
  const refreshToken = req.cookies?.['refresh_token'];
  if (typeof refreshToken !== 'string') {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const { accessToken, refreshToken: newRefreshToken } = await refresh(refreshToken);

  res.cookie('refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/v1/auth/refresh',
  });

  res.json({ accessToken });
}
