import { AppError } from './AppError';

export class UnexpectedError extends AppError {
    constructor(message: string, code = 'UNEXPECTED_ERROR', userMessage = 'Oops! Something went wrong on our end.') {
        super(message, code, userMessage, false); // Not operational, it's a bug!
    }
}
