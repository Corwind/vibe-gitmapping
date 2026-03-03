import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, OrthographicCamera } from 'three';
import { Text } from '@react-three/drei';
import { useTreeStore } from '../../store/useTreeStore';
import { useSettingsStore } from '../../store/useSettingsStore';

/** Offset from the file dot to the label (world units at zoom=1). */
const BASE_OFFSET = 1.0;

/**
 * FileLabels shows a filename tooltip next to the file node the user is hovering over.
 * Only visible when showFileLabels is enabled in settings and a file is hovered.
 * The label scales inversely with zoom so it stays the same size on screen.
 */
export default function FileLabels(): React.JSX.Element | null {
  const groupRef = useRef<Group>(null);
  const textRef = useRef<{ text: string }>(null);
  const prevFileId = useRef<string | null>(null);

  useFrame(({ camera }) => {
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

    // Scale inversely with camera zoom so text keeps constant screen size
    const zoom = (camera as OrthographicCamera).zoom ?? 8;
    const invZoom = 1 / zoom;

    group.visible = true;
    group.position.set(file.position[0] + BASE_OFFSET * invZoom, 0.2, file.position[2]);
    group.scale.set(invZoom, invZoom, invZoom);

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
