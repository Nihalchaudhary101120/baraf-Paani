import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import HQAdminDashboard from './HQAdmin/HQAdminDashboard';
import HQCommandDashboard from './HQCommand/HQCommandDashboard';
import MedicalOfficerDashboard from './MedicalDashboard/MedicalOfficerDashboard';
import CargoOfficerDashboard from './CargoDashboard/CargoOfficerDashboard';
import LogisticsOfficerDashboard from './CargoDashboard/LogisticsOfficerDashboard';

/**
 * Main Centralized Dashboard Router
 * Dynamically mounts the appropriate role-based dashboard:
 * - HQ_ADMIN:          System Administration Dashboard
 * - HQ_COMMAND:        Operations Command Center
 * - MEDICAL_OFFICER:   Antarctic Medical & Training Dashboard
 * - CARGO_OFFICER:     Cargo Officer Portal (Shipments, Manifests, QR)
 * - LOGISTICS_OFFICER: Logistics Officer Portal (QR Scan, Checkpoints, Offline Sync)
 * - Other roles:       Tailored command views
 */
const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'HQ_ADMIN';

  if (role === 'HQ_ADMIN') {
    return <HQAdminDashboard />;
  }

  if (role === 'MEDICAL_OFFICER') {
    return <MedicalOfficerDashboard />;
  }

  if (role === 'CARGO_OFFICER') {
    return <CargoOfficerDashboard />;
  }

  if (role === 'LOGISTICS_OFFICER') {
    return <LogisticsOfficerDashboard />;
  }

  // HQ_COMMAND and default operational view
  return <HQCommandDashboard />;
};

export default DashboardPage;
