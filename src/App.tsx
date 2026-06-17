import { useEffect } from 'react';
import { useStore } from './store';
import { dummyTasks, projects } from './dummyData';
import './App.css';
import Sidebar from './components/Sidebar';
import CalendarPanel from './components/CalendarPanel';
import TaskList from './components/TaskList';
import TaskDetailPanel from './components/TaskDetailPanel';

function App() {
  const { tasks, uiState, selectTask } = useStore();

  useEffect(() => {
    const store = useStore.getState();
    if (store.tasks.length === 0) {
      dummyTasks.forEach(task => store.addTask(task));
    }
  }, []);

  return (
    <div className="app-container">
      <Sidebar projects={projects} />
      <CalendarPanel />
      <div className="main-content">
        <div className="task-header">
          <h2>Inbox</h2>
          <button className="info-btn">ℹ️</button>
        </div>
        <TaskList tasks={tasks} onSelectTask={selectTask} />
      </div>
      {uiState.selectedTask && (
        <TaskDetailPanel task={uiState.selectedTask} />
      )}
    </div>
  );
}

export default App;
