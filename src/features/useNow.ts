import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Current time captured on mount and refreshed whenever the screen gains focus (keeps render pure). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => { setNow(Date.now()); }, []));
  return now;
}
