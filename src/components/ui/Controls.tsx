import { useCallback, useMemo } from 'react';
import { useAnimationStore } from '../../store/useAnimationStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { ColorScheme } from '../../store/useSettingsStore';
import { SPEED_PRESETS } from '../../utils/constants';

export default function Controls(): React.JSX.Element | null {
  const playing = useAnimationStore((s) => s.playing);
  const toggle = useAnimationStore((s) => s.toggle);
  const secondsPerDay = useAnimationStore((s) => s.secondsPerDay);
  const setSecondsPerDay = useAnimationStore((s) => s.setSecondsPerDay);
  const stepForward = useAnimationStore((s) => s.stepForward);
  const stepBackward = useAnimationStore((s) => s.stepBackward);
  const commits = useAnimationStore((s) => s.commits);
  const currentCommitIndex = useAnimationStore((s) => s.currentCommitIndex);

  const showFileLabels = useSettingsStore((s) => s.showFileLabels);
  const showDirectoryNames = useSettingsStore((s) => s.showDirectoryNames);
  const showEdges = useSettingsStore((s) => s.showEdges);
  const showBloom = useSettingsStore((s) => s.showBloom);
  const autoCamera = useSettingsStore((s) => s.autoCamera);
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const fileFilter = useSettingsStore((s) => s.fileFilter);
  const authorFilter = useSettingsStore((s) => s.authorFilter);

  const toggleFileLabels = useSettingsStore((s) => s.toggleFileLabels);
  const toggleDirectoryNames = useSettingsStore((s) => s.toggleDirectoryNames);
  const toggleEdges = useSettingsStore((s) => s.toggleEdges);
  const toggleBloom = useSettingsStore((s) => s.toggleBloom);
  const toggleAutoCamera = useSettingsStore((s) => s.toggleAutoCamera);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);
  const setFileFilter = useSettingsStore((s) => s.setFileFilter);
  const setAuthorFilter = useSettingsStore((s) => s.setAuthorFilter);

  // Derive unique authors from commits
  const authors = useMemo(() => {
    const set = new Set<string>();
    for (const c of commits) {
      set.add(c.author);
    }
    return Array.from(set).sort();
  }, [commits]);

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSecondsPerDay(parseFloat(e.target.value));
    },
    [setSecondsPerDay],
  );

  const handleColorSchemeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setColorScheme(e.target.value as ColorScheme);
    },
    [setColorScheme],
  );

  const handleAuthorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setAuthorFilter(e.target.value);
    },
    [setAuthorFilter],
  );

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `gitmapping-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  if (commits.length === 0) return null;

  return (
    <div style={styles.container}>
      {/* Playback Controls */}
      <div style={styles.section}>
        <div style={styles.playbackRow}>
          <button style={styles.btn} onClick={stepBackward} title="Previous commit (P)">
            {'|<'}
          </button>
          <button
            style={{ ...styles.btn, ...styles.playBtn }}
            onClick={toggle}
            title="Play/Pause (Space)"
          >
            {playing ? '||' : '\u25B6'}
          </button>
          <button style={styles.btn} onClick={stepForward} title="Next commit (N)">
            {'>|'}
          </button>
          <span style={styles.commitCount}>
            {currentCommitIndex + 1} / {commits.length}
          </span>
        </div>
      </div>

      {/* Speed — display as multiplier (bigger = faster) */}
      <div style={styles.section}>
        <label style={styles.label}>Speed</label>
        <select style={styles.select} value={secondsPerDay} onChange={handleSpeedChange}>
          {SPEED_PRESETS.map((s) => (
            <option key={s} value={s}>
              {Math.round(1 / s)}x
            </option>
          ))}
        </select>
      </div>

      {/* Display Toggles */}
      <div style={styles.section}>
        <label style={styles.label}>Display</label>
        <Toggle label="File labels" checked={showFileLabels} onChange={toggleFileLabels} />
        <Toggle label="Dir names" checked={showDirectoryNames} onChange={toggleDirectoryNames} />
        <Toggle label="Edges" checked={showEdges} onChange={toggleEdges} />
        <Toggle label="Bloom" checked={showBloom} onChange={toggleBloom} />
        <Toggle label="Auto camera" checked={autoCamera} onChange={toggleAutoCamera} />
      </div>

      {/* Color Scheme */}
      <div style={styles.section}>
        <label style={styles.label}>Colors</label>
        <select style={styles.select} value={colorScheme} onChange={handleColorSchemeChange}>
          <option value="language">Language</option>
          <option value="author">Author</option>
          <option value="age">Age</option>
        </select>
      </div>

      {/* Filters */}
      <div style={styles.section}>
        <label style={styles.label}>File filter</label>
        <input
          style={styles.input}
          type="text"
          placeholder="regex..."
          value={fileFilter}
          onChange={(e) => setFileFilter(e.target.value)}
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Author</label>
        <select style={styles.select} value={authorFilter} onChange={handleAuthorChange}>
          <option value="">All authors</option>
          {authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Export */}
      <div style={styles.section}>
        <button style={styles.btn} onClick={handleScreenshot} title="Save screenshot">
          Screenshot
        </button>
      </div>
    </div>
  );
}

function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: () => void;
}): React.JSX.Element {
  return (
    <label style={styles.toggleRow}>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={props.onChange}
        style={styles.checkbox}
      />
      <span style={styles.toggleLabel}>{props.label}</span>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: '200px',
    background: 'rgba(10, 10, 20, 0.85)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    pointerEvents: 'auto',
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  playbackRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  label: {
    fontSize: '10px',
    textTransform: 'uppercase',
    color: '#888',
    letterSpacing: '0.5px',
  },
  btn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '4px',
    color: '#e0e0e0',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1,
  },
  playBtn: {
    padding: '4px 12px',
    fontSize: '14px',
  },
  commitCount: {
    fontSize: '11px',
    color: '#888',
    marginLeft: 'auto',
    fontVariantNumeric: 'tabular-nums',
  },
  select: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '4px',
    color: '#e0e0e0',
    padding: '4px 6px',
    fontSize: '12px',
  },
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '4px',
    color: '#e0e0e0',
    padding: '4px 6px',
    fontSize: '12px',
    outline: 'none',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: '#4488ff',
  },
  toggleLabel: {
    fontSize: '12px',
    color: '#ccc',
  },
};
