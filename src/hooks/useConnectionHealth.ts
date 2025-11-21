// useConnectionHealth.ts - React hook for monitoring connection health

import { useState, useEffect } from 'react';
import { connectionHealthService, ConnectionHealth } from '@/services/connectionHealth';

export function useConnectionHealth() {
  const [connections, setConnections] = useState<ConnectionHealth[]>([]);
  const [systemHealth, setSystemHealth] = useState(connectionHealthService.getSystemHealth());

  useEffect(() => {
    // Load initial state
    setConnections(connectionHealthService.getAllConnections());

    // Subscribe to updates
    const unsubscribe = connectionHealthService.subscribe((updatedConnections) => {
      setConnections(updatedConnections);
      setSystemHealth(connectionHealthService.getSystemHealth());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const registerConnection = (
    id: string,
    type: ConnectionHealth['type'],
    name: string,
    metadata?: any
  ) => {
    connectionHealthService.registerConnection(id, type, name, metadata);
  };

  const checkConnection = async (id: string) => {
    return connectionHealthService.checkConnection(id);
  };

  const checkAllConnections = async () => {
    return connectionHealthService.checkAllConnections();
  };

  const getConnection = (id: string) => {
    return connectionHealthService.getConnectionHealth(id);
  };

  return {
    connections,
    systemHealth,
    registerConnection,
    checkConnection,
    checkAllConnections,
    getConnection
  };
}
