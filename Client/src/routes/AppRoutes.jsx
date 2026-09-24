import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { HomePage, LoginPage, DashboardPage, StationPage, NotFoundPage } from '@/pages';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

/**
 * Centralized Application Routes Definition
 */
const AppRoutes = () => {
  const { user, logout } = useAuth();

  return (
    <MainLayout user={user} onLogout={logout}>
      <Routes>
        {/* Public Routes */}
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.STATIONS}
          element={
            <ProtectedRoute>
              <StationPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all 404 Route */}
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
};

export default AppRoutes;
