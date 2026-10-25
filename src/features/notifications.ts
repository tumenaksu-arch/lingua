import { Platform } from 'react-native';

import { shellPlugin } from '@/platform/nativeShell';

/**
 * Daily study reminder via expo-notifications (SDK 57).
 * Verified API (node_modules/expo-notifications/build/*.d.ts):
 *   getPermissionsAsync, requestPermissionsAsync, scheduleNotificationAsync
 *   ({ content, trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId? } }),
 *   cancelScheduledNotificationAsync(id), setNotificationChannelAsync (Android), setNotificationHandler.
 * The module is loaded lazily and every call is guarded: in Expo Go the Android build
 * may lack the native module, in which case the feature reports `unsupported` and the
 * profile toggle is hidden instead of crashing.
 */
type Notifications = typeof import('expo-notifications');

const REMINDER_ID = 'lingua-daily-reminder';
const CHANNEL_ID = 'reminders';

let mod: Notifications | null | undefined;
function load(): Notifications | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-notifications') as Notifications;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    mod = null;
  }
  return mod;
}

/** Numeric id for the shell's LocalNotifications plugin (expo-notifications uses REMINDER_ID). */
const SHELL_REMINDER_ID = 1;

export function isSupported(): boolean {
  // In the Android web shell the reminder goes through the shell's LocalNotifications plugin.
  if (Platform.OS === 'web') return shellPlugin('LocalNotifications') !== null;
  return load() !== null;
}

/** true when the OS permission is granted (asks the user when undetermined). */
export async function requestPermission(): Promise<boolean> {
  const shell = shellPlugin('LocalNotifications');
  if (shell) {
    try {
      return (await shell.requestPermissions()).display === 'granted';
    } catch {
      return false;
    }
  }
  const n = load();
  if (!n) return false;
  try {
    const current = await n.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const next = await n.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

/** Replaces any existing reminder with one firing every day at hour:minute (device local time). */
export async function scheduleDailyReminder(hour: number, minute = 0): Promise<boolean> {
  const shell = shellPlugin('LocalNotifications');
  if (shell) {
    try {
      await cancelReminder();
      await shell.schedule({
        notifications: [
          {
            id: SHELL_REMINDER_ID,
            title: 'Love-Vox ⏰',
            body: 'Bugünkü dersini yapıp serini koru!',
            schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }
  const n = load();
  if (!n) return false;
  try {
    await cancelReminder();
    if (Platform.OS === 'android') {
      await n.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Günlük hatırlatma',
        importance: n.AndroidImportance.DEFAULT,
      });
    }
    await n.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'Love-Vox ⏰',
        body: 'Bugünkü dersini yapıp serini koru!',
      },
      trigger: {
        type: n.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelReminder(): Promise<void> {
  const shell = shellPlugin('LocalNotifications');
  if (shell) {
    try {
      await shell.cancel({ notifications: [{ id: SHELL_REMINDER_ID }] });
    } catch {
      /* nothing scheduled */
    }
    return;
  }
  const n = load();
  if (!n) return;
  try {
    await n.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    /* nothing scheduled */
  }
}
