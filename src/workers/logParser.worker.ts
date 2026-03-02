import { parseGourceLog } from '../utils/parser';
import type { ParserWorkerRequest, ParserWorkerResponse } from '../types';

/**
 * Web Worker for off-thread git log parsing.
 * Keeps the main thread free for 60fps rendering while parsing large logs.
 */

function handleMessage(data: ParserWorkerRequest): ParserWorkerResponse {
  switch (data.type) {
    case 'parse': {
      try {
        const commits = parseGourceLog(data.payload);
        return { type: 'parsed', commits };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown parse error';
        return { type: 'error', message };
      }
    }
    case 'parse-chunk': {
      try {
        const commits = parseGourceLog(data.payload);
        return {
          type: 'chunk-parsed',
          commits,
          chunkIndex: data.chunkIndex,
          isLast: data.isLast,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown parse error';
        return { type: 'error', message };
      }
    }
  }
}

self.onmessage = (event: MessageEvent<ParserWorkerRequest>): void => {
  const response = handleMessage(event.data);
  self.postMessage(response);
};

export { handleMessage };
