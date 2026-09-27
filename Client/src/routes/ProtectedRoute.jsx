import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/common/Loader';
import { ROUTES } from '@/utils/constants';

// Roles that require a completed Personnel profile before accessing the dashboard
const PERSONNEL_ROLES = [
  'SCIENTIST',
  'STATION_OPERATOR',
  'INVENTORY_MANAGER',
  'MEDICAL_OFFICER',
  'STATION_COMMANDER',
  'SHIP_OFFICER',
  'FLIGHT_OFFICER',
];

/**
 * Protected Route Wrapper Component
 * - Redirects unauthenticated users to /login
 * - Redirects personnel with INCOMPLETE profiles to /complete-profile
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="state-container" style={{ minHeight: '60vh' }}>
        <Spinner size="lg" />
        <p style={{ color: 'var(--text-secondary)' }}>Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // If on /complete-profile but the user does NOT need profile completion (e.g. HQ_ADMIN, LOGISTICS_OFFICER, or completed profile),
  // redirect immediately to /dashboard
  if (location.pathname === '/complete-profile') {
    if (!user || !PERSONNEL_ROLES.includes(user.role) || user.profileStatus !== 'INCOMPLETE') {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
  }

  // If the user is a personnel role with an INCOMPLETE profile,
  // force them to the profile completion page (unless they're already there)
  const needsProfileCompletion =
    user &&
    PERSONNEL_ROLES.includes(user.role) &&
    user.profileStatus === 'INCOMPLETE' &&
    location.pathname !== '/complete-profile';

  if (needsProfileCompletion) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
