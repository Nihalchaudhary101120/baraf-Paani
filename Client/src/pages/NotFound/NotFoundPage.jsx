import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common';
import { ROUTES } from '@/utils/constants';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="state-container" style={{ minHeight: '60vh' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--color-primary)' }}>404</h1>
      <h2>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Button onClick={() => navigate(ROUTES.HOME)}>
        Back to Home
      </Button>
    </div>
  );
};

export default NotFoundPage;
