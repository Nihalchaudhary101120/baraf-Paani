import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Card Component
 */
const Card = ({ children, title, isHoverable = false, className = '', headerAction }) => {
  return (
    <div className={`ui-card ${isHoverable ? 'ui-card-hoverable' : ''} ${className}`}>
      {(title || headerAction) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          {title && <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{title}</h3>}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  isHoverable: PropTypes.bool,
  className: PropTypes.string,
  headerAction: PropTypes.node,
};

export default Card;
