import { ErrorHandlerService, HandlingOptions } from '../services/ErrorHandlerService';
import { Result } from './Result';

/**
 * Wraps a promise to catch errors, forward them to the global handler,
 * and return a safe Result tuple.
 * 
 * @param promise The async operation to execute
 * @param options Handling options for the ErrorHandlerService
 * @returns Result tuple with either success/data or failure/error
 */
export const withErrorHandling = async <T>(
    promise: Promise<T>,
    options?: HandlingOptions
): Promise<Result<T>> => {
    try {
        const data = await promise;
        return { success: true, data, error: null };
    } catch (err) {
        const handledError = ErrorHandlerService.handle(err, options);
        return { success: false, data: null, error: handledError };
    }
};
