// Datenbrücke zum Android-Home-Screen-Widget (#30): Nach jedem Sync landet ein
// kompakter Snapshot der Widget-Ansichten in den Capacitor-Preferences
// (SharedPreferences "CapacitorStorage") — das native Widget liest ihn dort
// und schickt Erledigungen direkt per HTTP an den gespeicherten Server.
import { Preferences } from '@capacitor/preferences';
import { registerPlugin } from '@capacitor/core';
import { getBaseUrl } from './api';
import type { Task } from './types';
import { mobileToday, mobileNextAction, mobileInbox, isInNextWeekWindow } from './selectors';

export const WIDGET_DATA_KEY = 'widget-data';

// Tiny helper plugin (implemented in MainActivity) that pokes the widgets to
// redraw after fresh data was published. No-op when unavailable.
const WidgetRefresh = registerPlugin<{ refresh(): Promise<void> }>('WidgetRefresh');

export async function publishWidgetData(tasks: Task[]): Promise<void> {
  try {
    const pick = (list: Task[]) =>
      list
        .filter((t) => !t.completed)
        .slice(0, 40)
        .map((t) => ({ id: t.id, n: t.number, t: t.title }));
    const open = tasks.filter((t) => !t.parentId && !t.completed);
    const data = {
      serverUrl: getBaseUrl(),
      updatedAt: Date.now(),
      views: {
        today: pick(mobileToday(tasks)),
        nextweek: pick(open.filter((t) => t.thisWeek === true || isInNextWeekWindow(t))),
        priority: pick(mobileNextAction(tasks)),
        inbox: pick(mobileInbox(tasks)),
      },
    };
    await Preferences.set({ key: WIDGET_DATA_KEY, value: JSON.stringify(data) });
    await WidgetRefresh.refresh().catch(() => {});
  } catch {
    /* Browser/Dev ohne native Schicht */
  }
}
