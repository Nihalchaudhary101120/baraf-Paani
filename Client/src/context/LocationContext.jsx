import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null); // { latitude, longitude, accuracy, timestamp }
  const [accuracy, setAccuracy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);
  const trackingCallbackRef = useRef(null);

  // Check initial permission status if available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          setPermissionStatus(status.state);
          status.onchange = () => {
            setPermissionStatus(status.state);
          };
        })
        .catch(() => {
          // Permissions API might not support geolocation query in some browsers
        });
    }
  }, []);

  /**
   * One-time retrieval of current position.
   * Resolves coordinates or structured null object so callers are never blocked.
   */
  const getCurrentLocation = useCallback((options = {}) => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const errMsg = 'Geolocation is not supported by this browser/device.';
        setError(errMsg);
        setPermissionStatus('unsupported');
        setIsLoading(false);
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          timestamp: Date.now(),
          isAvailable: false,
          error: errMsg
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp || Date.now(),
            isAvailable: true
          };

          setLocation(locData);
          setAccuracy(position.coords.accuracy);
          setIsLoading(false);
          setError(null);
          setPermissionStatus('granted');

          resolve(locData);
        },
        (geoError) => {
          let errorMsg = 'Failed to acquire location.';
          if (geoError.code === geoError.PERMISSION_DENIED) {
            errorMsg = 'Location permission was denied. You can still proceed without coordinates.';
            setPermissionStatus('denied');
          } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
            errorMsg = 'GPS/network location signal unavailable in this environment.';
          } else if (geoError.code === geoError.TIMEOUT) {
            errorMsg = 'Location request timed out. Retrying or continuing without GPS.';
          }

          setIsLoading(false);
          setError(errorMsg);

          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
            timestamp: Date.now(),
            isAvailable: false,
            error: errorMsg
          });
        },
        geoOptions
      );
    });
  }, []);

  /**
   * Start live watch tracking (e.g. for dispatched responders).
   * Calls callback with fresh coordinates on each change.
   */
  const startLocationTracking = useCallback((callback = null, options = {}) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation not supported for tracking.');
      return false;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    trackingCallbackRef.current = callback;
    setIsTracking(true);
    setError(null);

    const geoOptions = {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000,
      ...options
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const locData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp || Date.now(),
          isAvailable: true
        };

        setLocation(locData);
        setAccuracy(position.coords.accuracy);

        if (trackingCallbackRef.current) {
          try {
            trackingCallbackRef.current(locData);
          } catch (cbErr) {
            console.error('[LocationContext] Callback error in location watch:', cbErr);
          }
        }
      },
      (geoError) => {
        console.warn('[LocationContext] Watch error:', geoError.message);
        setError(geoError.message);
      },
      geoOptions
    );

    watchIdRef.current = id;
    return true;
  }, []);

  /**
   * Stop active watch tracking immediately.
   */
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    trackingCallbackRef.current = null;
    setIsTracking(false);
  }, []);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const value = {
    location,
    accuracy,
    isLoading,
    error,
    permissionStatus,
    isTracking,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking,
    retryLocation: getCurrentLocation
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;
