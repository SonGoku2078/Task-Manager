import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { useStore } from './store';

async function boot() {
  const root = document.getElementById('root')!;
  root.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888">Lädt…</div>';

  await useStore.getState().loadAll();

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

boot();
