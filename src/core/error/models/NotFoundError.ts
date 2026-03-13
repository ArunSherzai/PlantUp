import { AppError } from './AppError';

export class NotFoundError extends AppError {
    constructor(message: string, code = 'NOT_FOUND', userMessage = 'The requested resource could not be found.') {
        super(message, code, userMessage, true);
    }
}
