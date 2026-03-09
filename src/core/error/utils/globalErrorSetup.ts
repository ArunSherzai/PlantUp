import { ErrorHandlerService } from '../services/ErrorHandlerService';

export const setupGlobalErrorHandling = () => {
    // 1. Catch unhandled synchronous JS Exceptions (e.g., a crash outside of a React component)
    const defaultErrorHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        // Pipe it into our central handler!
        ErrorHandlerService.handle(error, { showUI: true, uiType: 'alert' });

        // You can choose to let RN still crash the app if it's fatal, 
        // or you can try to keep it alive (usually safer to let it crash if it's truly fatal)
        if (isFatal) {
            defaultErrorHandler(error, isFatal);
        }
    });

    // 2. Catch unhandled Promise Rejections (The async functions you forgot to catch!)
    // React Native implements standard JS promise tracking
    const tracking: any = require('promise/setimmediate/rejection-tracking');
    tracking.enable({
        allRejections: true,
        onUnhandled: (id: string, error: any) => {
            // We caught an async error that had no try/catch!
            // Send it to our handler to show an Alert automatically.
            ErrorHandlerService.handle(error, { showUI: true, uiType: 'alert' });
        },
        onHandled: (id: string) => {
            // Do nothing, someone handled it later
        }
    });
};
