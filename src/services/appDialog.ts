export type AppDialogRole = 'default' | 'cancel' | 'destructive';
export type AppDialogVariant = 'info' | 'success' | 'warning' | 'error';
export type AppDialogPresentation = 'dialog' | 'sheet';

export interface AppDialogButton {
  key: string;
  label: string;
  role?: AppDialogRole;
  onPress?: () => void | Promise<void>;
}

export interface AppDialogRequest {
  title: string;
  message?: string;
  buttons: AppDialogButton[];
  variant?: AppDialogVariant;
  presentation?: AppDialogPresentation;
  dismissible?: boolean;
}

type AppDialogHost = (request: AppDialogRequest) => Promise<string | undefined>;

let host: AppDialogHost | null = null;

export function registerAppDialogHost(nextHost: AppDialogHost | null) {
  host = nextHost;
}

export async function showAppDialog(request: AppDialogRequest): Promise<string | undefined> {
  if (!host) {
    console.warn('[AppDialog] Dialog host not mounted yet:', request.title);
    return undefined;
  }

  return host(request);
}

export async function showAlertDialog(options: {
  title: string;
  message?: string;
  variant?: AppDialogVariant;
  confirmLabel?: string;
  dismissible?: boolean;
}) {
  await showAppDialog({
    title: options.title,
    message: options.message,
    variant: options.variant ?? 'info',
    dismissible: options.dismissible ?? true,
    presentation: 'dialog',
    buttons: [{ key: 'confirm', label: options.confirmLabel ?? 'OK' }],
  });
}

export async function showConfirmDialog(options: {
  title: string;
  message?: string;
  variant?: AppDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmRole?: AppDialogRole;
  dismissible?: boolean;
}) {
  const result = await showAppDialog({
    title: options.title,
    message: options.message,
    variant: options.variant ?? 'warning',
    dismissible: options.dismissible ?? false,
    presentation: 'dialog',
    buttons: [
      { key: 'cancel', label: options.cancelLabel ?? 'Cancel', role: 'cancel' },
      {
        key: 'confirm',
        label: options.confirmLabel ?? 'Confirm',
        role: options.confirmRole ?? 'default',
      },
    ],
  });

  return result === 'confirm';
}

export async function showActionSheet(options: {
  title: string;
  message?: string;
  variant?: AppDialogVariant;
  dismissible?: boolean;
  buttons: AppDialogButton[];
}) {
  return showAppDialog({
    title: options.title,
    message: options.message,
    variant: options.variant ?? 'info',
    dismissible: options.dismissible ?? true,
    presentation: 'sheet',
    buttons: options.buttons,
  });
}

export function useAppDialog() {
  return {
    showAlertDialog,
    showConfirmDialog,
    showActionSheet,
    showAppDialog,
  };
}
