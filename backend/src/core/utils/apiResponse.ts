import type { Response } from 'express';
import { HttpStatus } from '../constants/http.js';

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

interface ApiError {
  success: false;
  message: string;
  error: { code: string };
}

export function sendSuccess<T>(
  res: Response,
  message: string,
  data: T,
  statusCode: number = HttpStatus.OK
): void {
  const body: ApiSuccess<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  code: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR
): void {
  const body: ApiError = { success: false, message, error: { code } };
  res.status(statusCode).json(body);
}
