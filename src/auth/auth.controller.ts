import type { Request, Response } from 'express';
import { signup, login } from './auth.service.ts';

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
