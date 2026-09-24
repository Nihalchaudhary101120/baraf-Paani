import React from 'react';
import PropTypes from 'prop-types';
import Button from '../Button/Button';
import { COMPONENT_VARIANTS, COMPONENT_SIZES } from '@/utils/constants';

/**
 * Reusable Error State / Error Banner Component
 */
const ErrorMessage = ({ message, onRetry, isBanner = false }) => {
  if (isBanner) {
    return (
      <div className="error-banner">
        <span>⚠️ {message}</span>
        {onRetry && (
          <Button variant={COMPONENT_VARIANTS.DANGER} size={COMPONENT_SIZES.SMALL} onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="state-container">
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h3 style={{ color: 'var(--color-danger)' }}>Something went wrong</h3>
      <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {onRetry && (
        <Button variant={COMPONENT_VARIANTS.PRIMARY} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
  isBanner: PropTypes.bool,
};

export default ErrorMessage;
