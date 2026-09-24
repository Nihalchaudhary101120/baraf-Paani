import React from 'react';
import PropTypes from 'prop-types';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

/**
 * Main Layout wrapper component
 */
const MainLayout = ({ children, user, onLogout }) => {
  return (
    <div className="app-layout">
      <Header user={user} onLogout={onLogout} />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
};

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
  user: PropTypes.object,
  onLogout: PropTypes.func,
};

export default MainLayout;
