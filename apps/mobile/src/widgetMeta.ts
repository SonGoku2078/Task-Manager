// Compact meta line for a widget row — same symbols as the web task row (#30),
// pre-built in JS so the native widget only has to render a string. Kept free
// of api/env imports so it stays unit-testable.
import { formatDuration } from './duration';
import { isTodayFlagActive } from './selectors';
import type { Task } from './types';

export function widgetMeta(t: Task): string {
  const parts: string[] = [];
  if (t.dueDate) {
    parts.push(`📅 ${t.dueDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`);
  }
  if (t.startMinutes != null) {
    parts.push(`🕘 ${String(Math.floor(t.startMinutes / 60)).padStart(2, '0')}:${String(t.startMinutes % 60).padStart(2, '0')}`);
  }
  if (t.durationMin) parts.push(`⏱ ${formatDuration(t.durationMin)}`);
  if (t.recurrence && t.recurrence !== 'none') parts.push('↻');
  if (t.starred) parts.push('⭐');
  if (isTodayFlagActive(t)) parts.push('☀️');
  if (t.thisWeek) parts.push('🗓️');
  if (t.someday) parts.push('🌥️');
  if (t.waiting) parts.push('⏳');
  if ((t.comments?.length ?? 0) > 0) parts.push(`💬${t.comments!.length}`);
  return parts.join('  ');
}
