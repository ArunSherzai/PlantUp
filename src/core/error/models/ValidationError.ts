import { AppError } from './AppError';

export class ValidationError extends AppError {
    constructor(message: string, code = 'VALIDATION_ERROR', userMessage = 'Please check your input and try again.') {
        super(message, code, userMessage, true);
    }
}
