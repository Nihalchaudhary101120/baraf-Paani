import React from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

/**
 * Main Layout wrapper component for public routes (Home, Login)
 */
const MainLayout = ({ user, onLogout }) => {
  return (
    <div className="app-layout">
      <Header user={user} onLogout={onLogout} />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

MainLayout.propTypes = {
  user: PropTypes.object,
  onLogout: PropTypes.func,
};

export default MainLayout;
