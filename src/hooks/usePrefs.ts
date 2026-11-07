import { useCallback, useEffect, useState } from 'react';
import { loadPrefs, savePrefs, type AppPrefs } from '@/lib/prefs';

export function usePrefs() {
  const [prefs, setPrefs] = useState<AppPrefs>(loadPrefs);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const update = useCallback((patch: Partial<AppPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  /** Star toggle; a starred game leaves the blacklist. */
  const toggleFavorite = useCallback((id: string) => {
    setPrefs((prev) => {
      const isFav = prev.favorites.includes(id);
      return {
        ...prev,
        favorites: isFav ? prev.favorites.filter((g) => g !== id) : [...prev.favorites, id],
        blacklist: isFav ? prev.blacklist : prev.blacklist.filter((g) => g !== id),
      };
    });
  }, []);

  /** Blacklist toggle; a blacklisted game loses its star. */
  const toggleBlacklist = useCallback((id: string) => {
    setPrefs((prev) => {
      const isBanned = prev.blacklist.includes(id);
      return {
        ...prev,
        blacklist: isBanned ? prev.blacklist.filter((g) => g !== id) : [...prev.blacklist, id],
        favorites: isBanned ? prev.favorites : prev.favorites.filter((g) => g !== id),
      };
    });
  }, []);

  return { prefs, update, toggleFavorite, toggleBlacklist };
}
