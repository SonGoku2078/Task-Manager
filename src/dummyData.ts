import type { Task, Project, Category, Priority } from './types';

export const defaultProjects: Project[] = [
  { id: 'p-priority', name: 'Priorität', color: '#4caf50', icon: '📌' },
  { id: 'p-work', name: 'Work', color: '#2196f3', icon: '💼' },
  { id: 'p-personal', name: 'Personal', color: '#ff9800', icon: '🏠' },
  { id: 'p-learning', name: 'Learning', color: '#9c27b0', icon: '📚' },
];

export const defaultCategories: Category[] = [
  { id: 'c-urgent', name: 'Urgent', color: '#e53935' },
  { id: 'c-errand', name: 'Errand', color: '#fb8c00' },
  { id: 'c-home', name: 'Home', color: '#43a047' },
  { id: 'c-computer', name: 'Computer', color: '#1e88e5' },
  { id: 'c-waiting', name: 'Waiting', color: '#8e24aa' },
];

const priorities: Priority[] = ['low', 'medium', 'high'];

const seedTitles = [
  'Band tuck planche to handstand',
  'Playlist bei Schaa Eröffnung, war suler Bossa Nova',
  'CrossFit Einsatzplanung HS26',
  'Russische Bücher',
  'Claude AI: Instagram Follower erhöhen',
  'Download any video',
  'Cake Wallet und Silent Payment einrichten',
  'fmhy.net durchsehen',
  'Teleskop-Rohr für Feuer',
  'Der japanische Punkt am Handgelenk',
  'Biggo – Formular für Zwischendienst erhalten',
  'Problem nennen: Quantum Computing',
  '"Angaben der versicherten Person" einreichen',
  'Check aktueller Stand der Anzeige gegen SwissMedic',
  'Julian Manfrien anrufen',
  'CF Teaching nächste Woche ASVZ?',
  'Waschmittel herstellen',
  'Zimmer aufräumen',
  'Einkaufen für Wochenende',
  'Team Meeting vorbereiten',
];

const generateTasks = (): Task[] => {
  const today = new Date();
  return seedTitles.map((title, idx) => {
    const daysOffset = Math.floor(Math.random() * 30) - 10;
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + daysOffset);
    dueDate.setHours(9 + (idx % 8), 0, 0, 0);

    const catCount = Math.floor(Math.random() * 3);
    const categoryIds = Array.from({ length: catCount }, () =>
      defaultCategories[Math.floor(Math.random() * defaultCategories.length)].id
    ).filter((v, i, a) => a.indexOf(v) === i);

    return {
      id: `task-seed-${idx}`,
      number: idx + 1,
      title,
      description: '',
      projectId: defaultProjects[Math.floor(Math.random() * defaultProjects.length)].id,
      parentId: null,
      dueDate,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      categoryIds,
      completed: Math.random() > 0.82,
      createdAt: new Date(today.getTime() - Math.random() * 30 * 864e5),
      updatedAt: new Date(),
      starred: Math.random() > 0.7,
      recurrence: 'none',
      recurrenceEnd: null,
    };
  });
};

export const dummyTasks: Task[] = generateTasks();
