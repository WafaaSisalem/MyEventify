import { Router } from 'express';
import { signupHandler, loginHandler } from './auth.controller.ts';
import { validate } from '../middleware/validate.ts';
import { SignupSchema, LoginSchema } from './auth.schema.ts';

const router = Router();

router.post('/signup', validate(SignupSchema), signupHandler);
router.post('/login', validate(LoginSchema), loginHandler);

export default router;
