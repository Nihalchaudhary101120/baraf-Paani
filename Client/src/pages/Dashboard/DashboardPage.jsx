import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import HQAdminDashboard from './HQAdmin/HQAdminDashboard';
import HQCommandDashboard from './HQCommand/HQCommandDashboard';

/**
 * Main Centralized Dashboard Router
 * Dynamically mounts the appropriate role-based dashboard:
 * - HQ_ADMIN: System Administration Dashboard (Users, Stations, Devices, Diagnostics)
 * - HQ_COMMAND: Operations Command Center (Expeditions, Personnel Readiness, Supply Pipelines, SOS)
 * - Other roles: Tailored command views
 */
const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'HQ_ADMIN';

  if (role === 'HQ_ADMIN') {
    return <HQAdminDashboard />;
  }

  // HQ_COMMAND and default operational view
  return <HQCommandDashboard />;
};

export default DashboardPage;
