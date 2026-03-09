import { AppError } from '../models/AppError';
import { AuthError } from '../models/AuthError';
import { DatabaseError } from '../models/DatabaseError';
import { ValidationError } from '../models/ValidationError';
import { NetworkError } from '../models/NetworkError';
import { UnexpectedError } from '../models/UnexpectedError';

export interface SupabaseErrorShape {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
}

export const supabaseErrorMapper = (error: SupabaseErrorShape): AppError => {
    const code = error.code || 'UNKNOWN';
    const msg = error.message;

    // Supabase Auth Errors (usually don't have SQL state codes, but specific messages or AuthError shape)
    if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('jwt')) {
        return new AuthError(msg, 'AUTH_INVALID', 'Invalid email or password.');
    }

    // Network failures disguised as DB errors
    if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        return new NetworkError(msg, 'DB_NETWORK_ERROR');
    }

    // PostgreSQL Error Codes mapping
    // https://postgrest.org/en/stable/api.html#errors and Postgres codes
    switch (code) {
        case '23505': // unique_violation
            return new ValidationError(msg, 'DB_UNIQUE_VIOLATION', 'This record already exists.');
        case '23503': // foreign_key_violation
            return new DatabaseError(msg, 'DB_FK_VIOLATION', 'Referenced data does not exist.');
        case '23502': // not_null_violation
            return new ValidationError(msg, 'DB_NOT_NULL', 'Missing required information.');
        case '42P01': // undefined_table
            return new UnexpectedError(`Table missing: ${msg}`);
    }

    // Generic fallback for other Supabase DB errors
    return new DatabaseError(msg, `DB_ERROR_${code}`);
};
