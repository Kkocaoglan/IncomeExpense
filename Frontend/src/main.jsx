import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

const queryClient = new QueryClient();

// CSP nonce desteği için Emotion cache
const nonce = document.querySelector('meta[name="csp-nonce"]')?.content;
const cache = createCache({ 
  key: 'mui',
  nonce: nonce
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CacheProvider value={cache}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </CacheProvider>
  </StrictMode>,
)
