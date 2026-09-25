import React from 'react';
import { useEffect } from "react";

import {
  syncOfflineQueue,
  startSyncListener,
  stopSyncListener
} from "./services/syncServices/syncService";

import AppRoutes from '@/routes/AppRoutes';

function App() {
  useEffect(() => {

    // Sync immediately if internet already exists
    syncOfflineQueue();

    // Listen for internet restoration
    startSyncListener();

    return () => {
      stopSyncListener();
    };

  }, []);

  return (
    <AppRoutes />

  );
}

export default App;
