import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Text } from '@react-three/drei';
import { useTreeStore } from '../../store/useTreeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { FileNode } from '../../types';

/** Maximum number of file labels rendered at once (performance budget) */
const MAX_LABELS = 50;

/** Files modified within this window (ms) are considered "active" and get labels */
const ACTIVE_WINDOW_MS = 5000;

/** Per-label mutable state to avoid allocations in the render loop */
interface LabelState {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  text: string;
}

/** Module-level label state pool */
const labelPool: LabelState[] = Array.from({ length: MAX_LABELS }, () => ({
  visible: false,
  x: 0,
  y: 0,
  z: 0,
  text: '',
}));

/**
 * FileLabels renders filename text labels next to recently-active file nodes.
 * Uses a fixed pool of Text components that get recycled each frame.
 * Only renders when showFileLabels is enabled in settings.
 */
export default function FileLabels(): React.JSX.Element | null {
  const groupRef = useRef<Group>(null);
  const textRefs = useRef<Array<{ text: string } | null>>(
    Array.from({ length: MAX_LABELS }, () => null),
  );
  const groupRefs = useRef<Array<Group | null>>(Array.from({ length: MAX_LABELS }, () => null));

  useFrame(({ clock }) => {
    const showLabels = useSettingsStore.getState().showFileLabels;
    const group = groupRef.current;
    if (!group) return;

    if (!showLabels) {
      group.visible = false;
      return;
    }
    group.visible = true;

    const currentTimeMs = clock.getElapsedTime() * 1000;
    const files = useTreeStore.getState().files;

    // Collect recently active files, sorted by recency
    const activeFiles: FileNode[] = [];
    for (const file of files.values()) {
      if (!file.alive) continue;
      const elapsed = currentTimeMs - file.lastModified;
      if (elapsed < ACTIVE_WINDOW_MS) {
        activeFiles.push(file);
      }
    }

    // Sort by most recently modified first
    activeFiles.sort((a, b) => b.lastModified - a.lastModified);

    // Fill the label pool
    const count = Math.min(activeFiles.length, MAX_LABELS);
    for (let i = 0; i < MAX_LABELS; i++) {
      const ls = labelPool[i];
      if (i < count) {
        const file = activeFiles[i];
        const filename = file.id.split('/').pop() ?? file.id;
        ls.visible = true;
        ls.x = file.position[0] + 1.2;
        ls.y = 0.1;
        ls.z = file.position[2];
        ls.text = filename;
      } else {
        ls.visible = false;
      }
    }

    // Apply to refs
    for (let i = 0; i < MAX_LABELS; i++) {
      const ls = labelPool[i];
      const labelGroup = groupRefs.current[i];
      if (!labelGroup) continue;

      if (!ls.visible) {
        labelGroup.visible = false;
        continue;
      }

      labelGroup.visible = true;
      labelGroup.position.set(ls.x, ls.y, ls.z);

      const textObj = textRefs.current[i];
      if (textObj && textObj.text !== ls.text) {
        textObj.text = ls.text;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: MAX_LABELS }, (_, idx) => (
        <group
          key={idx}
          ref={(el: Group | null) => {
            groupRefs.current[idx] = el;
          }}
          visible={false}
        >
          <Text
            ref={(el: { text: string } | null) => {
              textRefs.current[idx] = el;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.3}
            color="#cccccc"
            anchorX="left"
            anchorY="middle"
            maxWidth={8}
          >
            {''}
          </Text>
        </group>
      ))}
    </group>
  );
}
