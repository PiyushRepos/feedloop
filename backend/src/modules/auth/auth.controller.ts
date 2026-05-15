import type { RequestHandler } from 'express';
import { authService } from './auth.service.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { HttpStatus } from '../../core/constants/http.js';
import type { AuthenticatedRequest } from '../../core/middleware/authenticate.js';
import type { RegisterInput, LoginInput, RefreshInput } from './auth.schema.js';

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body as RegisterInput);
  sendSuccess(res, 'Account created successfully', data, HttpStatus.CREATED);
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body as LoginInput);
  sendSuccess(res, 'Logged in successfully', data);
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const data = await authService.refresh(
    (req.body as RefreshInput).refreshToken
  );
  sendSuccess(res, 'Token refreshed', data);
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  await authService.logout((req.body as RefreshInput).refreshToken);
  sendSuccess(res, 'Logged out successfully', null);
});

export const me: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = (req as AuthenticatedRequest).user;
  const user = await authService.getMe(id);
  sendSuccess(res, 'User fetched successfully', { user });
});
