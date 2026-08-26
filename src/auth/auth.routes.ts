import { Router } from 'express';
import { signupHandler } from './auth.controller.ts';
import { validate } from '../middleware/validate.ts';
import { SignupSchema } from './auth.schema.ts';

const router = Router();

router.post('/signup', validate(SignupSchema), signupHandler);

export default router;
