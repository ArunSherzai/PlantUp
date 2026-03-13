import { AppError } from './AppError';

export class AuthError extends AppError {
    constructor(message: string, code = 'AUTH_FAILED', userMessage = 'Authentication failed. Please log in again.') {
        super(message, code, userMessage, true);
    }
}
