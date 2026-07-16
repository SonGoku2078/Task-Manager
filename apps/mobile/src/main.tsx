import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { useStore } from './store';

// Kick off the initial load BEFORE render, but never await it: loadAll()
// hydrates the offline snapshot synchronously up to its first await, so the
// first paint already shows cached tasks. Blocking here used to stall startup
// ~20 s when the LAN server was unreachable (outbox flush + 9 GETs, 10 s
// timeouts each); the auto-sync poller retries the load once the server is back.
useStore.getState().loadAll().catch((e) => console.warn('initial loadAll failed', e));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
