import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, OrthographicCamera } from 'three';
import { Text } from '@react-three/drei';
import { useTreeStore } from '../../store/useTreeStore';
import { useSettingsStore } from '../../store/useSettingsStore';

/**
 * All values below are in effective screen pixels because the group is scaled
 * by 1/zoom, and the ortho camera maps 1 world unit = zoom pixels.
 * So localValue * (1/zoom) * zoom = localValue screen pixels.
 */
const LABEL_OFFSET_PX = 8;
const FONT_SIZE_PX = 12;
const OUTLINE_WIDTH_PX = 0.4;
const MAX_WIDTH_PX = 200;

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
    group.position.set(file.position[0] + LABEL_OFFSET_PX * invZoom, 0.2, file.position[2]);
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
        fontSize={FONT_SIZE_PX}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        maxWidth={MAX_WIDTH_PX}
        outlineWidth={OUTLINE_WIDTH_PX}
        outlineColor="#000000"
      >
        {''}
      </Text>
    </group>
  );
}
