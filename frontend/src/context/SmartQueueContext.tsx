'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

export interface QueueItem {
  token: number;
  appointmentId: string;
  orderId?: string;
  patientId?: string;
  patientEmail?: string;
  doctorId?: string;
  ashaWorkerId?: string;
  hospitalName?: string;
  patientName: string;
  age: number;
  gender: string;
  village: string;
  doctorName: string;
  specialty: string;
  status: 'consulting' | 'waiting' | 'priority' | 'hold' | 'skipped' | 'completed';
  paymentStatus?: string;
  paymentAmount?: number;
  timeSlot?: string;
  date?: string;
  bookedAt: string;
  estimatedTime: string;
  symptoms: string;
  ashaWorker?: string;
}

interface SmartQueueContextType {
  queue: QueueItem[];
  currentConsultingToken: number | null;
  currentlyConsulting: QueueItem | null;
  nextToken: number | null;
  totalWaiting: number;
  myToken: QueueItem | null;
  loading: boolean;
  fetchQueue: () => Promise<void>;
  bookAppointment: (details: {
    patientId?: string;
    patientEmail?: string;
    patientName: string;
    age?: number;
    gender?: string;
    village?: string;
    doctorId?: string;
    doctorName?: string;
    symptoms?: string;
    ashaWorkerId?: string;
    ashaWorker?: string;
    isPriority?: boolean;
    hospitalName?: string;
    appointmentId?: string;
    orderId?: string;
    paymentStatus?: string;
    paymentAmount?: number;
    specialty?: string;
    timeSlot?: string;
    date?: string;
  }) => Promise<QueueItem | null>;
  doctorAction: (action: string, token?: number, targetIndex?: number) => Promise<void>;
}

const SmartQueueContext = createContext<SmartQueueContextType>({
  queue: [],
  currentConsultingToken: null,
  currentlyConsulting: null,
  nextToken: null,
  totalWaiting: 0,
  myToken: null,
  loading: true,
  fetchQueue: async () => {},
  bookAppointment: async () => null,
  doctorAction: async () => {},
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function SmartQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentConsultingToken, setCurrentConsultingToken] = useState<number | null>(null);
  const [currentlyConsulting, setCurrentlyConsulting] = useState<QueueItem | null>(null);
  const [nextToken, setNextToken] = useState<number | null>(null);
  const [totalWaiting, setTotalWaiting] = useState<number>(0);
  const [myToken, setMyToken] = useState<QueueItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user's active token from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arogya_my_queue_token');
      if (saved) {
        setMyToken(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const updateStateFromApi = useCallback((data: any) => {
    if (data && data.success) {
      setQueue(data.queue || []);
      setCurrentConsultingToken(data.currentConsultingToken || null);
      setCurrentlyConsulting(data.currentlyConsulting || null);
      setNextToken(data.nextToken || null);
      setTotalWaiting(data.totalWaiting || 0);

      // Keep myToken updated with latest status from server
      setMyToken(prev => {
        if (!prev) return null;
        const fresh = (data.queue || []).find((q: QueueItem) => q.token === prev.token || q.appointmentId === prev.appointmentId);
        if (fresh) {
          localStorage.setItem('arogya_my_queue_token', JSON.stringify(fresh));
          return fresh;
        }
        return prev;
      });
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/queue`);
      const data = await res.json();
      updateStateFromApi(data);
    } catch (err) {
      console.warn('Queue fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [updateStateFromApi]);

  // Socket.io real-time listener + polling fallback
  useEffect(() => {
    fetchQueue();

    const socket = io(API_BASE, { transports: ['websocket', 'polling'], autoConnect: true });

    socket.on('queue_updated', (data: any) => {
      updateStateFromApi(data);
    });

    const interval = setInterval(() => {
      fetchQueue();
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [fetchQueue, updateStateFromApi]);

  const bookAppointment = async (details: {
    patientId?: string;
    patientEmail?: string;
    patientName: string;
    age?: number;
    gender?: string;
    village?: string;
    doctorId?: string;
    doctorName?: string;
    symptoms?: string;
    ashaWorkerId?: string;
    ashaWorker?: string;
    isPriority?: boolean;
    hospitalName?: string;
    appointmentId?: string;
    orderId?: string;
    paymentStatus?: string;
    paymentAmount?: number;
    specialty?: string;
    timeSlot?: string;
    date?: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/api/queue/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setMyToken(data.token);
        localStorage.setItem('arogya_my_queue_token', JSON.stringify(data.token));
        await fetchQueue();
        return data.token;
      }
      return null;
    } catch (err) {
      console.error('Book appointment error:', err);
      return null;
    }
  };

  const doctorAction = async (action: string, token?: number, targetIndex?: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/queue/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token, targetIndex }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        updateStateFromApi(data.summary);
      }
    } catch (err) {
      console.error('Doctor queue action error:', err);
    }
  };

  return (
    <SmartQueueContext.Provider
      value={{
        queue,
        currentConsultingToken,
        currentlyConsulting,
        nextToken,
        totalWaiting,
        myToken,
        loading,
        fetchQueue,
        bookAppointment,
        doctorAction,
      }}
    >
      {children}
    </SmartQueueContext.Provider>
  );
}

export function useSmartQueue() {
  return useContext(SmartQueueContext);
}
