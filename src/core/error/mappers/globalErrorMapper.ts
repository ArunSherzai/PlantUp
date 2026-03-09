import { AppError } from '../models/AppError';
import { NetworkError } from '../models/NetworkError';
import { UnexpectedError } from '../models/UnexpectedError';
import { supabaseErrorMapper, SupabaseErrorShape } from './supabaseErrorMapper';

export const normalizeError = (error: unknown): AppError => {
    // 1. If it's already an AppError, re-use it.
    if (error instanceof AppError) {
        return error;
    }

    // 2. Map Supabase Errors (heuristic for Postgrest/Auth errors)
    if (typeof error === 'object' && error !== null && 'message' in error && ('code' in error || 'details' in error)) {
        return supabaseErrorMapper(error as SupabaseErrorShape);
    }

    // 3. Check for typical typical network errors
    if (error instanceof Error && error.message.toLowerCase().includes('network request failed')) {
        return new NetworkError(error.message, 'NETWORK_OFFLINE', 'Please check your internet connection and try again.');
    }

    // 4. Validation or standard errors
    const rawMessage = error instanceof Error ? error.message : String(error);
    return new UnexpectedError(rawMessage);
};
