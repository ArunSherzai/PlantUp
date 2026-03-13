import { AppError } from '../models/AppError';

export type Result<T, E = AppError> =
    | { success: true; data: T; error: null }
    | { success: false; data: null; error: E };
