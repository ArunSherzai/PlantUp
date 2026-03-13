import { AppError } from './AppError';

export class NetworkError extends AppError {
    constructor(message: string, code = 'NETWORK_ERROR', userMessage = 'Please check your internet connection and try again.') {
        super(message, code, userMessage, true);
    }
}
