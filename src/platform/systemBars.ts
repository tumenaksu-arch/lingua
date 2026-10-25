import { useEffect } from 'react';

import { shellPlugin } from './nativeShell';

/** Strip values to hand back when a screen-scoped override unmounts. */
export interface SystemBarsRestore {
  color: string;
  darkIcons: boolean;
}

/**
 * Inside the Android web shell (mobile-shell/, Capacitor 7) the WebView sits between the system
 * bars via margins, so the strip behind the status/navigation bars is the window decor background.
 * This hook tints that strip to match the page (e.g. the dark welcome landing) and picks light or
 * dark system bar icons. Outside the shell it does nothing; plugin errors are swallowed (an older
 * shell APK may not have the SystemBars plugin yet).
 *
 * The root layout calls this with the theme values for the app's lifetime. A screen that wants
 * its own strip (welcome) passes the theme values as `restore`, so when that screen unmounts the
 * effect cleanup explicitly hands the strip back to the theme — parent effects do NOT re-run on
 * child unmount, so without this the screen's strip would stick until the theme toggled.
 */
export function useSystemBars(color: string, darkIcons: boolean, restore?: SystemBarsRestore): void {
  useEffect(() => {
    const bars = shellPlugin('SystemBars');
    if (!bars) return;
    bars.set({ color, darkIcons }).catch(() => {});
    if (!restore) return;
    const { color: restoreColor, darkIcons: restoreDarkIcons } = restore;
    return () => {
      bars.set({ color: restoreColor, darkIcons: restoreDarkIcons }).catch(() => {});
    };
  }, [color, darkIcons, restore]);
}
