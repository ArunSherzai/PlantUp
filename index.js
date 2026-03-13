/* eslint-disable prettier/prettier */
import { registerRootComponent } from 'expo';
import App from 'src/app/App';
import { setupGlobalErrorHandling } from 'src/core/error/utils/globalErrorSetup';

setupGlobalErrorHandling();

registerRootComponent(App);
