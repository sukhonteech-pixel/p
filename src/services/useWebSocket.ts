import { useEffect, useRef, useState, useCallback } from 'react';
import { AutomationJob, AutomationLog, Device } from '../types/automation';

export interface WebSocketState {
  isConnected: boolean;
  lastEvent: string | null;
  activeScreenshot: string | null;
  activeJobProgress: {
    jobId: string;
    propertyNo: string;
    progress: number;
    currentStep: string;
    status: string;
  } | null;
}

export function useWebSocket(onEvent?: (event: string, payload: any) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);
  const [activeJobProgress, setActiveJobProgress] = useState<WebSocketState['activeJobProgress']>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { event: eventName, payload } = parsed;

          if (eventName === 'job.progress') {
            setActiveJobProgress({
              jobId: payload.jobId,
              propertyNo: payload.propertyNo,
              progress: payload.progress,
              currentStep: payload.currentStep,
              status: payload.status,
            });
          } else if (eventName === 'job.screenshot') {
            if (payload.screenshot) {
              setActiveScreenshot(payload.screenshot);
            }
          } else if (eventName === 'job.completed' || eventName === 'job.failed' || eventName === 'job.cancelled') {
            setActiveJobProgress((prev) => {
              if (prev && prev.jobId === payload.jobId) {
                return {
                  ...prev,
                  progress: eventName === 'job.completed' ? 100 : prev.progress,
                  status: eventName === 'job.completed' ? 'COMPLETED' : eventName === 'job.failed' ? 'FAILED' : 'CANCELLED',
                  currentStep: eventName === 'job.completed' ? 'Completed' : payload.error || 'Stopped',
                };
              }
              return prev;
            });
          }

          if (onEvent) {
            onEvent(eventName, payload);
          }
        } catch (err) {
          console.error('Error handling WS event:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 3 seconds
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.error('WebSocket connection failed:', err);
    }
  }, [onEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendEvent = (event: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, payload }));
    }
  };

  return {
    isConnected,
    activeScreenshot,
    activeJobProgress,
    sendEvent,
  };
}
