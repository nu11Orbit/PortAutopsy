import { useState, useEffect } from 'react';

export function useEventStream(url = 'ws://localhost:8000/ws/events') {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws;
    const connect = () => {
      try {
        ws = new WebSocket(url);
        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
          setConnected(false);
          setTimeout(connect, 2000);
        };
        ws.onmessage = (e) => {
          const event = JSON.parse(e.data);
          setEvents((prev) => [...prev, event].slice(-500)); // keep last 500
        };
      } catch {
        setTimeout(connect, 2000);
      }
    };
    connect();
    return () => ws?.close();
  }, [url]);

  return { events, connected };
}
