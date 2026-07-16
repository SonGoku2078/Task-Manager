import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useStore } from './store.ts'

// Kick off the initial load BEFORE render, but never await it: loadAll()
// hydrates the offline snapshot synchronously up to its first await, so the
// first paint already shows cached data. Blocking here stalled startup for the
// full fetch timeout when the server was unreachable; App shows its
// "Verbindung wird hergestellt…" banner until dataLoaded flips.
useStore.getState().loadAll().catch((e) => console.warn('initial loadAll failed', e));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
