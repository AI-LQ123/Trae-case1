import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useWebSocket } from './useWebSocket';
import { SyncService, SyncType, SyncResponse } from '../services/websocket/sync';
import { AppDispatch } from '../state/store';

interface UseSyncReturn {
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: Error | null;
  syncData: SyncResponse | null;
  requestSync: (syncTypes?: SyncType[]) => Promise<void>;
  resetSync: () => void;
}

let globalSyncService: SyncService | null = null;

export const useSync = (): UseSyncReturn => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [syncData, setSyncData] = useState<SyncResponse | null>(null);
  
  const { getClient, connected } = useWebSocket();
  const dispatch = useDispatch<AppDispatch>();
  const syncServiceRef = useRef<SyncService | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const initSyncService = () => {
      const wsClient = getClient();
      if (wsClient && !syncServiceRef.current) {
        syncServiceRef.current = new SyncService(wsClient);
        globalSyncService = syncServiceRef.current;

        syncServiceRef.current.setCallbacks({
          onSyncStart: () => {
            if (isMountedRef.current) {
              setIsSyncing(true);
              setError(null);
            }
          },
          onSyncComplete: (response) => {
            if (isMountedRef.current) {
              setIsSyncing(false);
              setLastSyncTime(response.serverTime);
              setSyncData(response);
              updateLocalState(response);
            }
          },
          onSyncError: (err) => {
            if (isMountedRef.current) {
              setIsSyncing(false);
              setError(err);
            }
          },
        });
      }
    };

    initSyncService();

    return () => {
      isMountedRef.current = false;
    };
  }, [getClient, dispatch]);

  const updateLocalState = useCallback((response: SyncResponse) => {
    console.log('Updating local state with sync data:', response);
  }, []);

  const requestSync = useCallback(async (syncTypes: SyncType[] = ['chat', 'tasks', 'notifications', 'terminals']) => {
    if (!connected) {
      setError(new Error('WebSocket not connected'));
      return;
    }

    if (syncServiceRef.current) {
      await syncServiceRef.current.requestSync(syncTypes);
    }
  }, [connected]);

  const resetSync = useCallback(() => {
    setLastSyncTime(null);
    setError(null);
    setSyncData(null);
  }, []);

  return {
    isSyncing,
    lastSyncTime,
    error,
    syncData,
    requestSync,
    resetSync,
  };
};

useSync.getSyncService = () => {
  return globalSyncService;
};
