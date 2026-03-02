import { useEffect } from 'react';
import { useAnimationStore } from '../store/useAnimationStore';
import { useCameraStore } from '../store/useCameraStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTreeStore } from '../store/useTreeStore';
import { SPEED_PRESETS, KEY_SPEED_MAP } from '../utils/constants';

/**
 * Registers global keyboard shortcuts for playback control, camera, and navigation.
 * Cleans up on unmount.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Ignore when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const animStore = useAnimationStore.getState();
      const cameraStore = useCameraStore.getState();

      switch (e.code) {
        case 'Space': {
          e.preventDefault();
          animStore.toggle();
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const presets = SPEED_PRESETS;
          const currentIdx = presets.indexOf(animStore.secondsPerDay);
          if (currentIdx < presets.length - 1) {
            animStore.setSecondsPerDay(presets[currentIdx + 1]);
          } else if (currentIdx === -1) {
            // Find the next preset above the current value
            const nextPreset = presets.find((p) => p > animStore.secondsPerDay);
            if (nextPreset !== undefined) {
              animStore.setSecondsPerDay(nextPreset);
            }
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const presets = SPEED_PRESETS;
          const currentIdx = presets.indexOf(animStore.secondsPerDay);
          if (currentIdx > 0) {
            animStore.setSecondsPerDay(presets[currentIdx - 1]);
          } else if (currentIdx === -1) {
            // Find the previous preset below the current value
            const prevPresets = presets.filter((p) => p < animStore.secondsPerDay);
            if (prevPresets.length > 0) {
              animStore.setSecondsPerDay(prevPresets[prevPresets.length - 1]);
            }
          }
          break;
        }
        case 'KeyN': {
          e.preventDefault();
          if (e.shiftKey) {
            animStore.stepBackward();
          } else {
            animStore.stepForward();
          }
          break;
        }
        case 'KeyP': {
          e.preventDefault();
          animStore.stepBackward();
          break;
        }
        case 'KeyV': {
          e.preventDefault();
          cameraStore.toggleMode();
          break;
        }
        case 'KeyF': {
          e.preventDefault();
          useSettingsStore.getState().toggleFullscreen();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          useTreeStore.getState().setSelectedFileId(null);
          break;
        }
        default: {
          // Number keys 1-9 for speed presets
          if (e.key in KEY_SPEED_MAP) {
            e.preventDefault();
            animStore.setSecondsPerDay(KEY_SPEED_MAP[e.key]);
          }
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
