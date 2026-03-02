import { useState, useCallback, useRef } from 'react';
import { useAnimationStore } from '../../store/useAnimationStore';
import { isValidGitUrl } from '../../utils/validation';
import type { ParserWorkerRequest, ParserWorkerResponse, InputSource } from '../../types';

export default function RepoInput(): React.JSX.Element | null {
  const commits = useAnimationStore((s) => s.commits);
  const loading = useAnimationStore((s) => s.loading);
  const error = useAnimationStore((s) => s.error);
  const setCommits = useAnimationStore((s) => s.setCommits);
  const setInputSource = useAnimationStore((s) => s.setInputSource);
  const setLoading = useAnimationStore((s) => s.setLoading);
  const setError = useAnimationStore((s) => s.setError);

  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseLogData = useCallback(
    (data: string, source: InputSource) => {
      setLoading(true);
      setError(null);
      setInputSource(source);

      const worker = new Worker(new URL('../../workers/logParser.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e: MessageEvent<ParserWorkerResponse>) => {
        const response = e.data;
        if (response.type === 'parsed') {
          if (response.commits.length === 0) {
            setError('No valid commits found in the provided data.');
            setLoading(false);
          } else {
            setCommits(response.commits);
            setLoading(false);
          }
        } else if (response.type === 'error') {
          setError(response.message);
          setLoading(false);
        }
        worker.terminate();
      };

      worker.onerror = () => {
        setError('Worker error: failed to parse log data.');
        setLoading(false);
        worker.terminate();
      };

      const message: ParserWorkerRequest = { type: 'parse', payload: data };
      worker.postMessage(message);
    },
    [setCommits, setInputSource, setLoading, setError],
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          parseLogData(reader.result, { type: 'file', filename: file.name });
        }
      };
      reader.onerror = () => {
        setError('Failed to read the file.');
      };
      reader.readAsText(file);
    },
    [parseLogData, setError],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleUrlSubmit = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!isValidGitUrl(trimmed)) {
      setError('Please enter a valid HTTP(S) URL.');
      return;
    }
    // For now, URL cloning is a placeholder - would need a backend
    setError(
      'HTTP repository cloning requires a backend service. Please upload a Gource log file instead.',
    );
    setInputSource({ type: 'url', url: trimmed });
  }, [urlInput, setError, setInputSource]);

  // Don't show if data is already loaded (early return AFTER all hooks)
  if (commits.length > 0) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h1 style={styles.title}>vibe-gitmapping</h1>
        <p style={styles.subtitle}>Visualize your git history in 3D</p>

        {/* URL Input */}
        <div style={styles.section}>
          <label style={styles.label}>Repository URL</label>
          <div style={styles.urlRow}>
            <input
              style={styles.input}
              type="text"
              placeholder="https://github.com/user/repo"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button style={styles.btn} onClick={handleUrlSubmit} disabled={loading}>
              Clone
            </button>
          </div>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        {/* File Upload */}
        <div
          style={{
            ...styles.dropZone,
            ...(dragOver ? styles.dropZoneActive : {}),
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.log,.gource"
            style={styles.hiddenInput}
            onChange={handleFileInput}
          />
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Parsing log data...</p>
            </div>
          ) : (
            <>
              <p style={styles.dropLabel}>Drop a Gource log file here</p>
              <p style={styles.dropHint}>or click to browse</p>
            </>
          )}
        </div>

        <p style={styles.formatHint}>Format: timestamp|username|action|filepath|color</p>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.85)',
    zIndex: 100,
    pointerEvents: 'auto',
  },
  card: {
    background: 'rgba(15, 15, 25, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '32px',
    width: '440px',
    maxWidth: '90vw',
    backdropFilter: 'blur(12px)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    textAlign: 'center',
    marginBottom: '24px',
  },
  section: {
    marginBottom: '16px',
  },
  label: {
    fontSize: '11px',
    textTransform: 'uppercase',
    color: '#888',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    display: 'block',
  },
  urlRow: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    color: '#e0e0e0',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
  },
  btn: {
    background: '#4488ff',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '16px 0',
  },
  dividerText: {
    fontSize: '12px',
    color: '#666',
    width: '100%',
    textAlign: 'center',
  },
  dropZone: {
    border: '2px dashed rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  dropZoneActive: {
    borderColor: '#4488ff',
    background: 'rgba(68, 136, 255, 0.08)',
  },
  hiddenInput: {
    display: 'none',
  },
  dropLabel: {
    fontSize: '14px',
    color: '#ccc',
    marginBottom: '4px',
  },
  dropHint: {
    fontSize: '12px',
    color: '#666',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(68,136,255,0.3)',
    borderTopColor: '#4488ff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '13px',
    color: '#aaa',
  },
  formatHint: {
    fontSize: '11px',
    color: '#555',
    textAlign: 'center',
    marginTop: '12px',
    fontFamily: 'monospace',
  },
  error: {
    fontSize: '12px',
    color: '#ff6666',
    textAlign: 'center',
    marginTop: '12px',
    padding: '8px',
    background: 'rgba(255, 0, 0, 0.08)',
    borderRadius: '4px',
  },
};
