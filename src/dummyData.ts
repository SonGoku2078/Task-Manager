import type { Task } from './types';

export const projects = [
  { id: '1', name: 'Priorität', color: '#4caf50', icon: '📌' },
  { id: '2', name: 'Work', color: '#2196f3', icon: '💼' },
  { id: '3', name: 'Personal', color: '#ff9800', icon: '🏠' },
  { id: '4', name: 'Learning', color: '#9c27b0', icon: '📚' },
];

const generateTasks = (): Task[] => {
  const today = new Date();
  const tasks: Task[] = [];

  const taskTitles = [
    'Band tuck planche to handstand',
    'Playlist bei Schaa eröffnung, war suler Bossa Novax',
    'CrossFit Einsatzplanung HS26 #06-08-2026 #19:00',
    'RussisChe BüCher',
    'claude KI AI: Instagram follower erhoehen',
    'download any video',
    'Cake wallet und silent payment einrichten',
    'fmhy.net',
    'Teleskop Rohr für feuer',
    'der japanische Punkt am Handgelenk',
    'Biggo - Formular für Zwischendienst erhalten',
    'Problem nennen: QuenenComputing',
    '"Angaben der versicherten Person" einreichen',
    'Check aktueller Stand von Anzeige gegen SwissMedic',
    'Julian Manfrien',
    '*CF teaching Next Week ASVZ ?',
    'Waschmittel herstellen',
    'Zimmer aufräumen',
    'Einkaufen für Wochenende',
    'Team Meeting vorbereiten',
  ];

  const tags = [
    ['Bug', 'Urgent'],
    ['Feature', 'Design'],
    ['Documentation'],
    ['Research'],
    ['Testing'],
  ];

  taskTitles.forEach((title, idx) => {
    const daysOffset = Math.floor(Math.random() * 30) - 10;
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + daysOffset);

    tasks.push({
      id: `task-${idx}`,
      title,
      description: `Description for task: ${title}`,
      projectId: projects[Math.floor(Math.random() * projects.length)].id,
      dueDate,
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
      tags: tags[Math.floor(Math.random() * tags.length)],
      completed: Math.random() > 0.8,
      createdAt: new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      starred: Math.random() > 0.7,
      recurrence: 'none',
    });
  });

  return tasks;
};

export const dummyTasks = generateTasks();
