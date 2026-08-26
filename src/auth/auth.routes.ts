import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { signupHandler, loginHandler, refreshHandler } from './auth.controller.ts';
import { validate } from '../middleware/validate.ts';
import { SignupSchema, LoginSchema } from './auth.schema.ts';

const router = Router();

router.post('/signup', validate(SignupSchema), signupHandler);
router.post('/login', validate(LoginSchema), loginHandler);
router.post('/refresh', cookieParser(), refreshHandler);

export default router;
