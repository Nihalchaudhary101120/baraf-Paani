import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import DashboardLayout from '@/components/layout/DashboardLayout/DashboardLayout';
import { HomePage, LoginPage, NotFoundPage } from '@/pages';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

// Dashboard Pages — lazy loaded
const DashboardPage          = lazy(() => import('@/pages/Dashboard/DashboardPage'));
const StationDashboard        = lazy(() => import('@/pages/Dashboard/StationDashboard/StationDashboard'));
const CargoDashboard         = lazy(() => import('@/pages/Dashboard/CargoDashboard/CargoDashboard'));
const InventoryDashboard     = lazy(() => import('@/pages/Dashboard/InventoryDashboard/InventoryDashboard'));
const FieldOpsDashboard      = lazy(() => import('@/pages/Dashboard/FieldOpsDashboard/FieldOpsDashboard'));
const EquipmentDashboard     = lazy(() => import('@/pages/Dashboard/EquipmentDashboard/EquipmentDashboard'));
const SOSDashboard           = lazy(() => import('@/pages/Dashboard/SOSDashboard/SOSDashboard'));
const PersonnelDashboard     = lazy(() => import('@/pages/Dashboard/PersonnelDashboard/PersonnelDashboard'));
const UserManagementDashboard = lazy(() => import('@/pages/Dashboard/UserManagementDashboard/UserManagementDashboard'));
const DeviceManagementDashboard = lazy(() => import('@/pages/Dashboard/DeviceManagement/DeviceManagementDashboard'));
const ExpeditionDashboard    = lazy(() => import('@/pages/Dashboard/ExpeditionDashboard/ExpeditionDashboard'));
const CompleteProfilePage    = lazy(() => import('@/pages/CompleteProfile/CompleteProfilePage'));

// HQ_ADMIN Read-Only Operational Views
const AdminMedicalView       = lazy(() => import('@/pages/Dashboard/HQAdmin/AdminMedicalView'));
const AdminCargoView         = lazy(() => import('@/pages/Dashboard/HQAdmin/AdminCargoView'));
const AdminFieldOpsView      = lazy(() => import('@/pages/Dashboard/HQAdmin/AdminFieldOpsView'));
const AdminInventoryView     = lazy(() => import('@/pages/Dashboard/HQAdmin/AdminInventoryView'));

const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '60vh', flexDirection: 'column', gap: '1rem',
    color: '#64748B',
  }}>
    <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s linear infinite' }}>sync</span>
    <span style={{ fontSize: '0.875rem' }}>Loading module...</span>
  </div>
);

/**
 * Centralized Application Routes Definition
 */
const AppRoutes = () => {
  const { user, logout } = useAuth();

  return (
    <Routes>
      {/* ── Public Routes (with MainLayout header/footer) ── */}
      <Route element={<MainLayout user={user} onLogout={logout} />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      </Route>

      {/* ── Protected Dashboard Routes (with DashboardLayout) ── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={
          <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
        } />
        <Route path="stations" element={
          <Suspense fallback={<PageLoader />}><StationDashboard /></Suspense>
        } />
        <Route path="users" element={
          <Suspense fallback={<PageLoader />}><UserManagementDashboard /></Suspense>
        } />
        <Route path="devices" element={
          <Suspense fallback={<PageLoader />}><DeviceManagementDashboard /></Suspense>
        } />
        <Route path="expeditions" element={
          <Suspense fallback={<PageLoader />}><ExpeditionDashboard /></Suspense>
        } />
        <Route path="cargo" element={
          <Suspense fallback={<PageLoader />}><CargoDashboard /></Suspense>
        } />
        <Route path="inventory" element={
          <Suspense fallback={<PageLoader />}><InventoryDashboard /></Suspense>
        } />
        <Route path="field" element={
          <Suspense fallback={<PageLoader />}><FieldOpsDashboard /></Suspense>
        } />
        <Route path="equipment" element={
          <Suspense fallback={<PageLoader />}><EquipmentDashboard /></Suspense>
        } />
        <Route path="sos" element={
          <Suspense fallback={<PageLoader />}><SOSDashboard /></Suspense>
        } />
        <Route path="personnel" element={
          <Suspense fallback={<PageLoader />}><PersonnelDashboard /></Suspense>
        } />
        {/* HQ_ADMIN Read-Only Operational Views */}
        <Route path="admin-medical" element={
          <Suspense fallback={<PageLoader />}><AdminMedicalView /></Suspense>
        } />
        <Route path="admin-cargo" element={
          <Suspense fallback={<PageLoader />}><AdminCargoView /></Suspense>
        } />
        <Route path="admin-field" element={
          <Suspense fallback={<PageLoader />}><AdminFieldOpsView /></Suspense>
        } />
        <Route path="admin-inventory" element={
          <Suspense fallback={<PageLoader />}><AdminInventoryView /></Suspense>
        } />
      </Route>

      {/* Legacy /stations route redirect to /dashboard/stations */}
      <Route path={ROUTES.STATIONS} element={<Navigate to="/dashboard/stations" replace />} />

      {/* Profile Completion — only authenticated personnel see this */}
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <CompleteProfilePage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;