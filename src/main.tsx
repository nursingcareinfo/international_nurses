if (import.meta.env.DEV) {
  import("react-grab");
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SupabaseProvider } from './components/SupabaseProvider.tsx';
import './index.css';
import { initAnalytics } from './lib/analytics.ts';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SupabaseProvider>
      <App />
    </SupabaseProvider>
  </StrictMode>,
);

