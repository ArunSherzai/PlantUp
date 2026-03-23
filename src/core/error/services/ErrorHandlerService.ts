import { Alert } from 'react-native';
import { normalizeError } from '../mappers/globalErrorMapper';
import { AppError } from '../models/AppError';
import { AuthError } from '../models/AuthError';

export interface HandlingOptions {
    showUI?: boolean;
    uiType?: 'toast' | 'alert' | 'silent';
    silentLog?: boolean;
}

export const ErrorHandlerService = {
    handle: (err: unknown, options: HandlingOptions = { showUI: true, uiType: 'alert' }): AppError => {
        const error = normalizeError(err);
        const { showUI = true, uiType = 'alert', silentLog = false } = options;

        // 1. Centralized Logging (e.g., Sentry, Crashlytics)
        if (!error.isOperational) {
            // Log developer bugs as fatals/non-fatals
            console.error('[CRITICAL BUG]', error.message, error.stack);
            // crashlytics().recordError(error);
        } else if (!silentLog) {
            console.warn(`[Handled AppError: ${error.code}]`, error.message);
        }

        // 2. High-level Side Effects
        if (error instanceof AuthError && (error.code === 'SESSION_EXPIRED' || error.code === 'UNAUTHORIZED')) {
            // Emit event or dispatch action to force logout
            // e.g., EventRegister.emit('force_logout')
            console.warn('[AUTH] Triggering force logout due to auth error');
        }

        // 3. UI Feedback Strategy
        if (showUI) {
            if (uiType === 'alert') {
                Alert.alert('Notice', error.userMessage);
            } else if (uiType === 'toast') {
                // Fallback or actual toast implementation
                // Toast.show({ type: 'error', text1: 'Error', text2: error.userMessage });
                console.log('[TOAST ERROR]', error.userMessage);
            }
        }

        return error;
    }
};
