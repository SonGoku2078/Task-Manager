// Fällige-Task-Reminder (#30): Tasks mit Uhrzeit melden sich zur Startzeit,
// dazu eine tägliche 08:00-Übersicht. Läuft nur nativ (Capacitor); im Browser
// werfen die Plugin-Aufrufe und werden still geschluckt.
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from './types';
import { isSameDay } from './selectors';

const SUMMARY_ID = 900001;

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const state = await LocalNotifications.checkPermissions();
    if (state.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false; // Browser/Dev ohne native Schicht
  }
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// Re-scheduled after every sync, so the plan follows the current data: all
// pending notifications are replaced in one go.
export async function scheduleReminders(tasks: Task[]): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const now = new Date();
    const dueToday = tasks.filter(
      (t) => !t.parentId && !t.completed && t.dueDate && isSameDay(t.dueDate, now)
    );

    const notifications = [];
    for (const t of dueToday) {
      if (t.startMinutes == null) continue;
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, t.startMinutes);
      if (at <= now) continue;
      notifications.push({
        id: t.number, // stabile, kleine Int-Id
        title: `⏰ ${t.title}`,
        body: `Fällig um ${hhmm(t.startMinutes)}`,
        schedule: { at, allowWhileIdle: true },
      });
    }

    // Tägliche Morgenübersicht; der Text entspricht dem Stand des letzten Syncs.
    notifications.push({
      id: SUMMARY_ID,
      title: '📋 SelfManaged',
      body: dueToday.length
        ? `${dueToday.length} Aufgabe${dueToday.length === 1 ? '' : 'n'} heute fällig`
        : 'Heute keine fälligen Aufgaben 🎉',
      schedule: { on: { hour: 8, minute: 0 }, allowWhileIdle: true },
    });

    await LocalNotifications.schedule({ notifications });
  } catch {
    /* Browser/Dev ohne native Schicht */
  }
}
