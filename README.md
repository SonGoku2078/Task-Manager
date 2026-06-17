# Task Manager - Nozbe Clone

A fully-functional, modern task management application built with React, TypeScript, and Vite. Replicate of Nozbe's clean, productive design with a focus on simplicity and efficiency.

## ✨ Features

### ✅ Current Implementation (MVP v1.0)
- **Sidebar Navigation** - Access all views and projects
- **Mini Calendar View** - June 2026 calendar with week highlighting
- **Task Management** - Full CRUD operations (Create, Read, Update, Delete)
- **Task Display** - Checkbox, title, due date, priority, tags, star system
- **State Management** - Zustand for reactive updates
- **Dummy Data** - 20+ sample tasks auto-loaded
- **Responsive Design** - Nozbe-inspired UI with custom CSS
- **Type Safety** - Full TypeScript support

### 🔄 Planned Features
- Repeating/recurring tasks (daily, weekly, monthly)
- Drag-and-drop task management between dates
- Calendar click to create new tasks
- Search and advanced filtering
- Dark mode
- Multiple project support
- Team collaboration features

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Date Handling**: date-fns
- **Styling**: CSS Modules + Custom CSS
- **Package Manager**: npm

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

App available at `http://localhost:5173`

### Production Build

```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/              # React UI components
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── CalendarPanel.tsx   # Mini calendar widget
│   ├── TaskList.tsx        # Task list rendering
│   ├── TaskDetailPanel.tsx # Task detail editor
│   └── *.css               # Component-level styles
├── store.ts                # Zustand state management
├── types.ts                # TypeScript interfaces & types
├── dummyData.ts            # Sample data generator
├── App.tsx                 # Main application component
├── App.css                 # Global application styles
└── index.css               # Base styles
```

## 🏗 Architecture

### State Management (Zustand)
- Tasks array with full CRUD operations
- UI state for selected task and current view
- Calendar date state for week navigation
- Actions: addTask, updateTask, deleteTask, toggleTask, toggleStar

### Component Hierarchy
```
App
├── Sidebar           (Navigation items)
├── CalendarPanel     (Mini calendar with week view)
└── Main Content
    ├── TaskHeader    (Page title)
    ├── TaskList      (All tasks)
    │   └── TaskItem  (Individual task)
    └── TaskDetailPanel (Task editor, conditional)
```

### Data Flow
1. Components subscribe to Zustand store
2. User interactions dispatch store actions
3. Store updates state (immutably)
4. Components re-render with new data

## 🎨 Design

- **Color Scheme**: Green accents (#4caf50), Dark sidebar (#2d2d2d)
- **Typography**: System fonts (-apple-system, Segoe UI, Roboto)
- **Layout**: Flexbox-based, responsive
- **Interactions**: Smooth transitions, hover effects, visual feedback

## 📝 Usage

### Creating a Task
1. Tasks are auto-populated from dummy data
2. Future: Click "Add Task" or calendar date to create

### Checking Off Tasks
- Click checkbox to mark task complete
- Task shows visual strikethrough effect

### Starring Tasks
- Click star icon to favorite/unfavorite tasks
- Starred tasks display with green star

### Viewing Task Details
- Click task to open detail panel (right side)
- Edit title, description, due date, priority, tags

## 🔍 What's Working

✅ Task display with metadata
✅ Checkbox toggling (visual feedback)
✅ Star/favorite system
✅ Calendar navigation
✅ Zustand state updates
✅ Responsive layout
✅ TypeScript compilation
✅ Hot module reloading (HMR)

## 🚧 Known Limitations

- Task detail panel shows but not all edits persist
- No task creation from UI yet
- No date filtering by calendar day
- No repeating task logic
- No team features

## 📦 Dependencies

- `react` ^18.3.0
- `react-dom` ^18.3.0
- `zustand` ^4.5.0
- `date-fns` ^3.0.0
- `vite` ^5.1.0
- `typescript` ^5.2.0

## 📄 License

MIT
