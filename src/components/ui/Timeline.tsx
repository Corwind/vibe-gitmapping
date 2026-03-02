import { useCallback, useRef, useMemo } from 'react';
import { useAnimationStore } from '../../store/useAnimationStore';
import { formatDate, formatDateTime, computeHeatmap } from '../../utils/timelineHelpers';

const HEATMAP_BUCKETS = 200;

export default function Timeline(): React.JSX.Element | null {
  const timeRange = useAnimationStore((s) => s.timeRange);
  const currentTimestamp = useAnimationStore((s) => s.currentTimestamp);
  const commits = useAnimationStore((s) => s.commits);
  const setCurrentTimestamp = useAnimationStore((s) => s.setCurrentTimestamp);
  const setCurrentCommitIndex = useAnimationStore((s) => s.setCurrentCommitIndex);
  const barRef = useRef<HTMLDivElement>(null);

  const heatmap = useMemo(() => {
    if (!timeRange) return [];
    return computeHeatmap(commits, timeRange.start, timeRange.end, HEATMAP_BUCKETS);
  }, [commits, timeRange]);

  const progress = useMemo(() => {
    if (!timeRange || timeRange.start === timeRange.end) return 0;
    return ((currentTimestamp - timeRange.start) / (timeRange.end - timeRange.start)) * 100;
  }, [currentTimestamp, timeRange]);

  const seekToPosition = useCallback(
    (clientX: number) => {
      if (!barRef.current || !timeRange) return;
      const rect = barRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ts = timeRange.start + fraction * (timeRange.end - timeRange.start);
      setCurrentTimestamp(ts);
      // Find the closest commit index
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < commits.length; i++) {
        const dist = Math.abs(commits[i].timestamp - ts);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setCurrentCommitIndex(closest);
    },
    [timeRange, commits, setCurrentTimestamp, setCurrentCommitIndex],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      seekToPosition(e.clientX);

      const onMouseMove = (ev: MouseEvent): void => {
        seekToPosition(ev.clientX);
      };
      const onMouseUp = (): void => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [seekToPosition],
  );

  if (!timeRange) return null;

  return (
    <div style={styles.container}>
      <div style={styles.dateDisplay}>{formatDateTime(currentTimestamp)}</div>
      <div style={styles.timelineRow}>
        <span style={styles.dateLabel}>{formatDate(timeRange.start)}</span>
        <div ref={barRef} style={styles.bar} onMouseDown={handleMouseDown}>
          {/* Heatmap background */}
          <div style={styles.heatmapContainer}>
            {heatmap.map((intensity, i) => (
              <div
                key={i}
                style={{
                  ...styles.heatmapBucket,
                  backgroundColor: `rgba(68, 136, 255, ${intensity * 0.6})`,
                }}
              />
            ))}
          </div>
          {/* Playhead */}
          <div
            style={{
              ...styles.playhead,
              left: `${progress}%`,
            }}
          />
          {/* Progress fill */}
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
            }}
          />
        </div>
        <span style={styles.dateLabel}>{formatDate(timeRange.end)}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '8px 16px 12px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    pointerEvents: 'auto',
    zIndex: 10,
  },
  dateDisplay: {
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '6px',
    fontVariantNumeric: 'tabular-nums',
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  dateLabel: {
    fontSize: '11px',
    color: '#888',
    whiteSpace: 'nowrap',
    minWidth: '80px',
    fontVariantNumeric: 'tabular-nums',
  },
  bar: {
    flex: 1,
    height: '20px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '4px',
    position: 'relative',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  heatmapContainer: {
    display: 'flex',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heatmapBucket: {
    flex: 1,
    height: '100%',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: 'rgba(68, 136, 255, 0.15)',
    pointerEvents: 'none',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    width: '2px',
    height: '100%',
    background: '#4488ff',
    transform: 'translateX(-1px)',
    pointerEvents: 'none',
    boxShadow: '0 0 6px rgba(68,136,255,0.6)',
    zIndex: 1,
  },
};
