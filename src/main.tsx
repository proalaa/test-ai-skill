import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { systemClock } from './clock';
import { createBoardStorage } from './storage/boardStorage';

// The composition root: the only place the real localStorage and system time are wired in.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App storage={createBoardStorage(window.localStorage)} clock={systemClock} />
  </StrictMode>,
);
