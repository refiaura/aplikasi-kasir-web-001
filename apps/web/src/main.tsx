import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { queryClient } from './lib/query';
import { router } from './router';
import './stores/theme'; // efek samping: terapkan tema tersimpan
import './theme.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemen #root tidak ditemukan.');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
