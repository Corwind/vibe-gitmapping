import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Text } from '@react-three/drei';
import { useTreeStore } from '../../store/useTreeStore';
import { useSettingsStore } from '../../store/useSettingsStore';

/**
 * FileLabels shows a filename tooltip next to the file node the user is hovering over.
 * Only visible when showFileLabels is enabled in settings and a file is hovered.
 */
export default function FileLabels(): React.JSX.Element | null {
  const groupRef = useRef<Group>(null);
  const textRef = useRef<{ text: string }>(null);
  const prevFileId = useRef<string | null>(null);

  useFrame(() => {
    const showLabels = useSettingsStore.getState().showFileLabels;
    const group = groupRef.current;
    if (!group) return;

    const hoveredFileId = useTreeStore.getState().hoveredFileId;

    if (!showLabels || !hoveredFileId) {
      group.visible = false;
      prevFileId.current = null;
      return;
    }

    const file = useTreeStore.getState().files.get(hoveredFileId);
    if (!file) {
      group.visible = false;
      return;
    }

    group.visible = true;
    group.position.set(file.position[0] + 1.0, 0.2, file.position[2]);

    if (textRef.current && prevFileId.current !== hoveredFileId) {
      const filename = file.id.split('/').pop() ?? file.id;
      textRef.current.text = filename;
      prevFileId.current = hoveredFileId;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <Text
        ref={textRef}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.5}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        maxWidth={20}
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {''}
      </Text>
    </group>
  );
}
