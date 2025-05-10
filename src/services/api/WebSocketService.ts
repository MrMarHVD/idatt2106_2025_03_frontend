import SockJS from 'sockjs-client';
import { Client, over, Frame } from 'stompjs';
import type { NotificationMessage } from '@/models/NotificationMessage';

// Ensure global is defined for SockJS
declare global {
  interface Window {
    global: Window;
  }
}

window.global = window;

let stompClient: Client | null = null;

export const connectWebSocket = () => {
  if (stompClient?.connected) {
    console.log('WebSocket already connected');
    return;
  }

  console.log('Creating new SockJS connection...');
  const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';
  const socket = new SockJS(wsUrl);
  stompClient = over(socket);

  stompClient.debug = (str) => {
    console.log('STOMP Debug:', str);
  };

  stompClient.connect(
    {},
    () => {
      console.log('Connected to WebSocket');
      if (!stompClient) {
        console.error('Stomp client is null after connection');
        return;
      }

      stompClient.subscribe(
        '/topic/notifications',
        (message) => {
          console.log('Received notification:', message.body);
          // Handle notification
        }
      );
    },
    (error) => {
      console.error('WebSocket connection error:', error);
    }
  );
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    if (stompClient.connected) {
      stompClient.disconnect(() => {
        console.log('Disconnected from WebSocket');
      });
    }
    stompClient = null;
  }
};

export function connectNotificationSocket(userId: string | number, onNotification: (msg: NotificationMessage) => void) {
  if (!userId) {
    console.warn('No user ID provided, cannot connect to notification socket');
    return;
  }

  // Convert userId to string for consistency
  const userIdStr = userId.toString();

  // If already connected, disconnect first
  if (stompClient?.connected) {
    console.log('Already connected to WebSocket, disconnecting first...');
    disconnectNotificationSocket();
  }

  try {
    console.log('Creating new SockJS connection...');
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';
    console.log('Using WebSocket URL:', wsUrl);
    console.log('Environment variables:', {
      VITE_WS_URL: import.meta.env.VITE_WS_URL,
      VITE_API_URL: import.meta.env.VITE_API_URL
    });
    const socket = new SockJS(wsUrl);
    stompClient = over(socket);

    // Enable debug logging for troubleshooting
    stompClient.debug = (str) => {
      console.log('STOMP Debug:', str);
    };

    console.log('Attempting to connect to WebSocket server...');
    stompClient.connect(
      {},
      () => {
        const topic = `/topic/notifications/${userIdStr}`;
        console.log('WebSocket connected, subscribing to topic:', topic);

        if (!stompClient) {
          console.error('Stomp client is null after connection');
          return;
        }

        stompClient.subscribe(
          topic,
          (message: { body: string }) => {
            console.log('Received raw message:', message);
            if (message.body) {
              try {
                const notification = JSON.parse(message.body) as NotificationMessage;
                console.log('Parsed notification:', notification);
                onNotification(notification);
              } catch (error) {
                console.error('Error parsing notification:', error, 'Raw message:', message.body);
              }
            } else {
              console.warn('Received empty message body');
            }
          },
          (error: Error) => {
            console.error('Error in subscription callback:', error);
          }
        );
        console.log('Successfully subscribed to topic:', topic);
      },
      (error: string | Frame) => {
        console.error('WebSocket connection error:', error);
        if (error instanceof Frame) {
          console.error('Frame details:', {
            command: error.command,
            headers: error.headers,
            body: error.body
          });
        }
      }
    );
  } catch (error) {
    console.error('Failed to initialize WebSocket connection:', error);
  }
}

export function disconnectNotificationSocket() {
  if (stompClient) {
    try {
      console.log('Disconnecting WebSocket...');
      if (stompClient.connected) {
        stompClient.disconnect(() => {
          console.log('WebSocket disconnected');
        });
      } else {
        console.log('WebSocket was not connected');
      }
      stompClient = null;
    } catch (error) {
      console.error('Error disconnecting from WebSocket:', error);
    }
  }
}
