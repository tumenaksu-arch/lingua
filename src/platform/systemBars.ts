import { useEffect } from 'react';

import { shellPlugin } from './nativeShell';

/**
 * Inside the Android web shell (mobile-shell/, Capacitor 7) the WebView sits between the system
 * bars via margins, so the strip behind the status/navigation bars is the window decor background.
 * This hook tints that strip to match the page (e.g. the dark welcome landing) and picks light or
 * dark system bar icons. Outside the shell it does nothing; plugin errors are swallowed (an older
 * shell APK may not have the SystemBars plugin yet).
 *
 * Mount/unmount ordering does the stacking: the root layout calls this with the theme values and
 * each screen that wants its own strip (welcome) calls it on mount — when that screen unmounts the
 * layout's effect runs again and the theme values win.
 */
export function useSystemBars(color: string, darkIcons: boolean): void {
  useEffect(() => {
    const bars = shellPlugin('SystemBars');
    if (!bars) return;
    bars.set({ color, darkIcons }).catch(() => {});
  }, [color, darkIcons]);
}
