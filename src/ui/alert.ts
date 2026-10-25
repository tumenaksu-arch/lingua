import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Cross-platform `Alert.alert`. react-native-web ships `Alert.alert` as an empty function,
 * so on the web (and in the Android web shell) every confirm silently did nothing — e.g.
 * "Çıkış yap" never signed out and the lesson ✕ never left the lesson.
 * On the web this falls back to the browser dialogs: `window.confirm` when there is a
 * choice (the Capacitor shell renders it as a native Android dialog), `window.alert` otherwise.
 * Use this instead of importing `Alert` from react-native (enforced by a test).
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const list = buttons ?? [];
  if (list.length <= 1) {
    globalThis.alert?.(text);
    list[0]?.onPress?.();
    return;
  }
  // The confirming action is the non-cancel button (destructive first), the dismissing one the cancel button.
  const cancel = list.find((b) => b.style === 'cancel') ?? list[0];
  const confirm = list.find((b) => b.style === 'destructive') ?? list.find((b) => b !== cancel) ?? list[list.length - 1];
  const ok = globalThis.confirm?.(text) ?? false;
  (ok ? confirm : cancel)?.onPress?.();
}
