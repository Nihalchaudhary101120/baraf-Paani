import React from 'react';
import PropTypes from 'prop-types';
import { COMPONENT_VARIANTS, COMPONENT_SIZES } from '@/utils/constants';
import { Spinner } from '../Loader';

/**
 * Reusable Button Component
 */
const Button = ({
  children,
  type = 'button',
  variant = COMPONENT_VARIANTS.PRIMARY,
  size = COMPONENT_SIZES.MEDIUM,
  isLoading = false,
  isDisabled = false,
  onClick,
  className = '',
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  
  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={isDisabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size={COMPONENT_SIZES.SMALL} />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(Object.values(COMPONENT_VARIANTS)),
  size: PropTypes.oneOf(Object.values(COMPONENT_SIZES)),
  isLoading: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Button;
