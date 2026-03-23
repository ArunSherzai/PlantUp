import { AppError } from './AppError';

export class DatabaseError extends AppError {
    constructor(message: string, code = 'DB_ERROR', userMessage = 'We had trouble saving your data. Please try again.') {
        super(message, code, userMessage, true);
    }
}
