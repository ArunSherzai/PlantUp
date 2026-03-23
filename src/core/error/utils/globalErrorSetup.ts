import { ErrorHandlerService } from '../services/ErrorHandlerService';

/**
 * Initializes global error handlers to catch unhandled exceptions
 * and unhandled promise rejections across the entire app.
 *
 * Call this once in your app entry point (e.g., index.js or App.tsx).
 */
export const setupGlobalErrorHandling = () => {
    catchUnhandledExceptions();
    catchUnhandledPromiseRejections();
};

/**
 * Overrides React Native's global error handler to pipe
 * synchronous JS crashes into `ErrorHandlerService`.
 */
function catchUnhandledExceptions() {
    const defaultHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        ErrorHandlerService.handle(error, { showUI: true, uiType: 'alert' });

        // Let RN handle truly fatal errors (force crash) to avoid undefined state
        if (isFatal) {
            defaultHandler(error, isFatal);
        }
    });
}

/**
 * Enables tracking for unhandled promise rejections (async errors
 * without a try/catch) and routes them through `ErrorHandlerService`.
 */
function catchUnhandledPromiseRejections() {
    const tracking: any = require('promise/setimmediate/rejection-tracking');

    tracking.enable({
        allRejections: true,
        onUnhandled: (_id: string, error: any) => {
            ErrorHandlerService.handle(error, { showUI: true, uiType: 'alert' });
        },
        onHandled: (_id: string) => {
            // Already handled elsewhere — no action needed
        },
    });
}
