import { useSettingsStore } from '../../store/useSettingsStore';

/**
 * Effects component for post-processing.
 * Currently provides a placeholder that checks the bloom toggle from settings.
 * Full UnrealBloomPass integration requires @react-three/postprocessing,
 * which will be added when the package is installed.
 *
 * Toggle-able via the settings store's showBloom flag.
 */
export default function Effects(): React.JSX.Element | null {
  const showBloom = useSettingsStore((s) => s.showBloom);

  if (!showBloom) return null;

  // Bloom post-processing will be added here once @react-three/postprocessing
  // is installed. For now, return null when bloom is off.
  // The architecture is ready: showBloom toggle controls rendering.
  return null;
}
