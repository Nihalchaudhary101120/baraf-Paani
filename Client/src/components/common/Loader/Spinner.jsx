import React from 'react';
import PropTypes from 'prop-types';
import { COMPONENT_SIZES } from '@/utils/constants';

export const Spinner = ({ size = COMPONENT_SIZES.MEDIUM, className = '' }) => {
  return <div className={`spinner spinner-${size} ${className}`} role="status" aria-label="Loading" />;
};

Spinner.propTypes = {
  size: PropTypes.oneOf(Object.values(COMPONENT_SIZES)),
  className: PropTypes.string,
};

export const Skeleton = ({ width = '100%', height = '20px', className = '', style = {} }) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
    />
  );
};

Skeleton.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  style: PropTypes.object,
};
