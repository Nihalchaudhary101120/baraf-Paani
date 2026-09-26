import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import { MedicalProvider } from '@/context/MedicalContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <MedicalProvider>
            <App />
          </MedicalProvider>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
