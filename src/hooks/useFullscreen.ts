import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Syncs the fullscreen setting store with the actual browser fullscreen API.
 */
export function useFullscreen(): void {
  const fullscreen = useSettingsStore((s) => s.fullscreen);
  const setFullscreen = useSettingsStore((s) => s.setFullscreen);

  useEffect(() => {
    if (fullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen denied by browser
        setFullscreen(false);
      });
    } else if (!fullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Already exited
      });
    }
  }, [fullscreen, setFullscreen]);

  useEffect(() => {
    function onFullscreenChange(): void {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [setFullscreen]);
}
