import React from 'react';
import PropTypes from 'prop-types';
import Button from '../Button/Button';

/**
 * Reusable Empty State Component
 */
const EmptyState = ({ title = 'No Data Found', description, actionLabel, onAction, icon = '📂' }) => {
  return (
    <div className="state-container">
      <div style={{ fontSize: '3rem' }}>{icon}</div>
      <h3>{title}</h3>
      {description && <p style={{ color: 'var(--text-secondary)' }}>{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

EmptyState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  icon: PropTypes.node,
};

export default EmptyState;
