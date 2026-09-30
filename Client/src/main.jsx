import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import { MedicalProvider } from '@/context/MedicalContext';
import { ToastProvider } from '@/context/ToastContext';
import { SKUProvider } from '@/context/SKUContext';
import { InventoryProvider } from '@/context/InventoryContext';
import { FieldExcursionProvider } from '@/context/FieldExcursionContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <MedicalProvider>
            <ToastProvider>
              <SKUProvider>
                <InventoryProvider>
                  <FieldExcursionProvider>
                    <App />
                  </FieldExcursionProvider>
                </InventoryProvider>
              </SKUProvider>
            </ToastProvider>
          </MedicalProvider>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
