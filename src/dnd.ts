import type { DragEvent } from 'react';

// Extra MIME type that carries a multi-task selection alongside the plain id.
export const TASK_IDS_MIME = 'application/x-task-ids';

// Mark a drag as carrying tasks. `primaryId` keeps single-task drops working
// (handlers that read 'text/plain'); `allIds` adds the full selection when > 1.
export function writeTaskIds(e: DragEvent, primaryId: string, allIds?: string[]) {
  e.dataTransfer.setData('text/plain', primaryId);
  if (allIds && allIds.length > 1) {
    e.dataTransfer.setData(TASK_IDS_MIME, JSON.stringify(allIds));
  }
}

// Read all task ids from a drop — the full selection if present, else the single id.
export function readTaskIds(e: DragEvent): string[] {
  const multi = e.dataTransfer.getData(TASK_IDS_MIME);
  if (multi) {
    try {
      const arr = JSON.parse(multi);
      if (Array.isArray(arr) && arr.length) return arr as string[];
    } catch {
      /* fall through to single id */
    }
  }
  const single = e.dataTransfer.getData('text/plain');
  return single ? [single] : [];
}
