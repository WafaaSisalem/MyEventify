import { HttpError } from '../errors/http-error.ts';
import { hashPassword } from './auth.utils.ts';
import * as authRepo from './auth.repository.ts';

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
