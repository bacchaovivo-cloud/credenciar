import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket) return;

    // 🔐 FIX ARQU-01: Não usa localStorage. O cookie httpOnly é enviado automaticamente
    // pelo browser com `withCredentials: true`. O servidor valida via middleware.
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      withCredentials: true,  // Envia o cookie httpOnly automaticamente
    });

    this.socket.on('checkin', (data) => {
      this.trigger('checkin', data);
    });
    
    this.socket.on('checkin_sucesso', (data) => {
      this.trigger('checkin_sucesso', data);
      this.trigger('checkin', data); // Alias unificado
    });

    this.socket.on('vip_arrival', (data) => {
      this.trigger('vip_arrival', data);
    });

    this.socket.on('stats_update', (data) => {
      this.trigger('stats_update', data);
    });

    this.socket.on('queue_update', (data) => {
      this.trigger('queue_update', data);
    });

    this.socket.on('hardware_alert', (data) => {
      this.trigger('hardware_alert', data);
    });

    this.socket.on('anomaly_alert', (data) => {
      this.trigger('anomaly_alert', data);
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const filtered = this.listeners.get(event).filter(cb => cb !== callback);
      this.listeners.set(event, filtered);
    }
  }

  trigger(event, data) {
    if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socketInstance = new SocketService();
export default socketInstance;
