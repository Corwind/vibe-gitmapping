import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useSettingsStore } from '../../store/useSettingsStore';

/**
 * Effects component for post-processing.
 * Renders UnrealBloom when the bloom toggle is enabled.
 * Uses @react-three/postprocessing for efficient GPU-based bloom.
 */
export default function Effects(): React.JSX.Element | null {
  const showBloom = useSettingsStore((s) => s.showBloom);

  if (!showBloom) return null;

  return (
    <EffectComposer>
      <Bloom intensity={1.2} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
    </EffectComposer>
  );
}
