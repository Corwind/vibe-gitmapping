import { useMemo } from 'react';
import { useTreeStore } from '../../store/useTreeStore';
import { useAnimationStore } from '../../store/useAnimationStore';

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function InfoPanel(): React.JSX.Element | null {
  const selectedFileId = useTreeStore((s) => s.selectedFileId);
  const files = useTreeStore((s) => s.files);
  const setSelectedFileId = useTreeStore((s) => s.setSelectedFileId);
  const commits = useAnimationStore((s) => s.commits);

  const file = selectedFileId ? files.get(selectedFileId) : undefined;

  // Compute action history for this file from commits
  const actionHistory = useMemo(() => {
    if (!selectedFileId) return [];
    const history: { timestamp: number; author: string; action: string }[] = [];
    for (const commit of commits) {
      for (const f of commit.files) {
        if (f.path === selectedFileId) {
          history.push({
            timestamp: commit.timestamp,
            author: commit.author,
            action: f.action,
          });
        }
      }
    }
    // Most recent first
    return history.reverse().slice(0, 20);
  }, [selectedFileId, commits]);

  if (!file) return null;

  const actionLabels: Record<string, string> = { A: 'Added', M: 'Modified', D: 'Deleted' };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>{file.name}</span>
        <button style={styles.closeBtn} onClick={() => setSelectedFileId(null)} title="Close (Esc)">
          x
        </button>
      </div>

      <div style={styles.field}>
        <span style={styles.label}>Path</span>
        <span style={styles.value}>{file.id}</span>
      </div>

      <div style={styles.field}>
        <span style={styles.label}>Extension</span>
        <span style={styles.value}>{file.extension || 'none'}</span>
      </div>

      <div style={styles.field}>
        <span style={styles.label}>Last Author</span>
        <span style={styles.value}>{file.lastAuthor}</span>
      </div>

      <div style={styles.field}>
        <span style={styles.label}>Last Modified</span>
        <span style={styles.value}>{formatTimestamp(file.lastModified)}</span>
      </div>

      <div style={styles.field}>
        <span style={styles.label}>Status</span>
        <span style={{ ...styles.value, color: file.alive ? '#4caf50' : '#ff5252' }}>
          {file.alive ? 'Alive' : 'Deleted'}
        </span>
      </div>

      {actionHistory.length > 0 && (
        <div style={styles.historySection}>
          <span style={styles.label}>History</span>
          <div style={styles.historyList}>
            {actionHistory.map((h, i) => (
              <div key={i} style={styles.historyItem}>
                <span style={styles.historyAction}>{actionLabels[h.action] ?? h.action}</span>
                <span style={styles.historyAuthor}>{h.author}</span>
                <span style={styles.historyDate}>{formatTimestamp(h.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: '280px',
    background: 'rgba(10, 10, 20, 0.9)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px',
    pointerEvents: 'auto',
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 6px',
    borderRadius: '4px',
    lineHeight: 1,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '8px',
  },
  label: {
    fontSize: '10px',
    textTransform: 'uppercase',
    color: '#666',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  value: {
    fontSize: '12px',
    color: '#ccc',
    wordBreak: 'break-all',
  },
  historySection: {
    marginTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '8px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '4px',
  },
  historyItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'baseline',
    fontSize: '11px',
  },
  historyAction: {
    color: '#4488ff',
    minWidth: '55px',
  },
  historyAuthor: {
    color: '#aaa',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  historyDate: {
    color: '#666',
    fontSize: '10px',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
};
