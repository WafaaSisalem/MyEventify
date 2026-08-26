import type { Request, Response } from 'express';
import { signup } from './auth.service.ts';

export async function signupHandler(req: Request, res: Response) {
  const { email, password, name } = req.body;

  const user = await signup(email, password, name);

  res.status(201).json(user);
}
