import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useStore } from './store.ts'

async function boot() {
  const root = document.getElementById('root')!;

  // Show a minimal loading screen while the server responds.
  root.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666">Lade Daten…</div>';

  await useStore.getState().loadAll();

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

boot();
