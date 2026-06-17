import type { Priority } from './types';

export interface TemplateTask {
  title: string;
  priority?: Priority;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  tasks: TemplateTask[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-move',
    name: 'Umzug',
    icon: '📦',
    color: '#2196f3',
    description: 'Alles für einen reibungslosen Wohnungswechsel.',
    tasks: [
      { title: 'Umzugsunternehmen anfragen', priority: 'high' },
      { title: 'Kartons besorgen' },
      { title: 'Adressänderung melden', priority: 'high' },
      { title: 'Strom/Internet ummelden' },
      { title: 'Alte Wohnung kündigen', priority: 'high' },
      { title: 'Renovierung organisieren' },
      { title: 'Nachsendeauftrag einrichten' },
    ],
  },
  {
    id: 'tpl-launch',
    name: 'Produkt-Launch',
    icon: '🚀',
    color: '#9c27b0',
    description: 'Von der Idee bis zum Go-Live.',
    tasks: [
      { title: 'Zielgruppe definieren', priority: 'high' },
      { title: 'Landingpage erstellen' },
      { title: 'Pricing festlegen', priority: 'high' },
      { title: 'Beta-Tester einladen' },
      { title: 'Marketing-Plan schreiben' },
      { title: 'Launch-Ankündigung vorbereiten' },
      { title: 'Analytics einrichten' },
    ],
  },
  {
    id: 'tpl-week',
    name: 'Wochenplanung',
    icon: '🗓️',
    color: '#4caf50',
    description: 'Wiederkehrende Routine für die Woche.',
    tasks: [
      { title: 'Wochenrückblick' },
      { title: 'Top-3-Ziele festlegen', priority: 'high' },
      { title: 'Einkauf planen' },
      { title: 'Sport-Termine eintragen' },
      { title: 'Inbox auf Null bringen' },
    ],
  },
  {
    id: 'tpl-event',
    name: 'Event-Planung',
    icon: '🎉',
    color: '#ff9800',
    description: 'Veranstaltung organisieren — nichts vergessen.',
    tasks: [
      { title: 'Datum & Location festlegen', priority: 'high' },
      { title: 'Gästeliste erstellen' },
      { title: 'Einladungen versenden', priority: 'high' },
      { title: 'Catering organisieren' },
      { title: 'Programm planen' },
      { title: 'Helfer koordinieren' },
    ],
  },
];
