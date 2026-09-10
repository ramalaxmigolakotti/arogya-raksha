'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useUserRole } from './UserRoleContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';


export interface AmbulanceLocationStream {
  dispatchId: string;
  lat: number;
  lng: number;
  speed: number;
  eta: number;
  status: 'dispatched' | 'en_route' | 'arrived_scene' | 'transporting' | 'arrived_hospital' | 'completed';
  vehicleNo: string;
  driverName: string;
  patientName: string;
  locationName: string;
}

export interface EmergencySosData {
  dispatchId: string;
  patientName: string;
  village: string;
  location: string;
  message: string;
  priority: 'high' | 'critical';
  timestamp: string;
  vehicleNo?: string;
  eta?: string;
}

export interface AshaTicket {
  id: string;
  ashaName: string;
  village: string;
  category: string;
  title: string;
  description: string;
  patientName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  doctorNotes?: string;
  assignedDoctor?: string;
}

export interface HealthcareOrder {
  id: string;
  orderNumber: string;
  patientName: string;
  items: Array<{ name: string; qty: number; price: number }>;
  totalAmount: number;
  status: 'placed' | 'packed' | 'dispatched' | 'out_for_delivery' | 'delivered';
  deliveryAgent?: string;
  eta?: string;
  createdAt: string;
}

export interface RealtimeToast {
  id: string;
  targetRole?: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message: string;
}

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeAmbulanceStream: AmbulanceLocationStream | null;
  activeSosAlerts: EmergencySosData[];
  tickets: AshaTicket[];
  orders: HealthcareOrder[];
  isBroadcastingGps: boolean;
  
  // Actions
  triggerEmergencySos: (details: Partial<EmergencySosData>) => void;
  updateAmbulanceLocation: (data: Partial<AmbulanceLocationStream>) => void;
  startAmbulanceGpsBroadcast: (dispatchId: string) => void;
  stopAmbulanceGpsBroadcast: () => void;
  createAshaTicket: (ticketData: Partial<AshaTicket>) => Promise<AshaTicket | null>;
  updateAshaTicket: (id: string, updates: Partial<AshaTicket>) => Promise<void>;
  createOrder: (orderData: Partial<HealthcareOrder>) => Promise<HealthcareOrder | null>;
  updateOrderStatus: (id: string, status: HealthcareOrder['status']) => void;
  sendCrossPanelToast: (toastData: Omit<RealtimeToast, 'id'>) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const RealtimeContext = createContext<RealtimeContextType>({
  socket: null,
  isConnected: false,
  activeAmbulanceStream: null,
  activeSosAlerts: [],
  tickets: [],
  orders: [],
  isBroadcastingGps: false,
  triggerEmergencySos: () => {},
  updateAmbulanceLocation: () => {},
  startAmbulanceGpsBroadcast: () => {},
  stopAmbulanceGpsBroadcast: () => {},
  createAshaTicket: async () => null,
  updateAshaTicket: async () => {},
  createOrder: async () => null,
  updateOrderStatus: () => {},
  sendCrossPanelToast: () => {},
});

// Seed data for initial tickets
const SEED_TICKETS: AshaTicket[] = [
  {
    id: 'TCK-2026-8842',
    ashaName: 'Lakshmi Devi',
    village: 'Peruru Ward 4',
    category: 'Maternal Risk',
    title: 'High-risk 3rd trimester mother needs doctor consultation',
    description: 'Patient Sita Devi (Age 26) showing elevated BP (150/95) and edema. Requires priority checkup.',
    patientName: 'Sita Devi',
    priority: 'critical',
    status: 'open',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    doctorNotes: '',
    assignedDoctor: 'Dr. Ananya Sharma',
  },
  {
    id: 'TCK-2026-8843',
    ashaName: 'Priya Kumari',
    village: 'Kothapeta',
    category: 'Vaccine Deficit',
    title: 'Polio & BCG vaccine shortage at PHC center',
    description: 'Only 3 vials remaining for upcoming drive on Tuesday. 45 infants scheduled.',
    patientName: 'Community Drive',
    priority: 'high',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    doctorNotes: 'Requisition sent to District Cold Chain store.',
    assignedDoctor: 'Dr. Ramesh Verma',
  },
  {
    id: 'TCK-2026-8844',
    ashaName: 'Lakshmi Devi',
    village: 'Peruru Ward 2',
    category: 'Sanitation Hazard',
    title: 'Open water stagnation near Anganwadi',
    description: 'Increased mosquito breeding leading to 4 reported fever cases in young children.',
    patientName: 'Anganwadi Area',
    priority: 'medium',
    status: 'open',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    doctorNotes: '',
    assignedDoctor: '',
  },
];

// Seed data for initial e-commerce orders
const SEED_ORDERS: HealthcareOrder[] = [
  {
    id: 'ORD-2026-9041',
    orderNumber: 'ORD-2026-9041',
    patientName: 'Ramesh Rao',
    items: [
      { name: 'Paracetamol 500mg Strip', qty: 2, price: 40 },
      { name: 'ORS Electrolyte Sachet', qty: 5, price: 100 },
    ],
    totalAmount: 140,
    status: 'out_for_delivery',
    deliveryAgent: 'Kishore (Pharma Express)',
    eta: '15 mins',
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'ORD-2026-9042',
    orderNumber: 'ORD-2026-9042',
    patientName: 'Sunitha Lakshmi',
    items: [
      { name: 'Digital Blood Pressure Monitor', qty: 1, price: 1450 },
      { name: 'Vitamin C 500mg Tablets', qty: 1, price: 180 },
    ],
    totalAmount: 1630,
    status: 'dispatched',
    deliveryAgent: 'Express Delivery',
    eta: '45 mins',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { role } = useUserRole();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [activeAmbulanceStream, setActiveAmbulanceStream] = useState<AmbulanceLocationStream | null>({
    dispatchId: 'EMR-2026-0412',
    lat: 17.3850,
    lng: 78.4867,
    speed: 48,
    eta: 4,
    status: 'en_route',
    vehicleNo: 'AP-39-AMB-108',
    driverName: 'Rajesh Kumar',
    patientName: 'Ramesh Rao',
    locationName: 'Ward 14, Peruru',
  });

  const [activeSosAlerts, setActiveSosAlerts] = useState<EmergencySosData[]>([
    {
      dispatchId: 'EMR-2026-0412',
      patientName: 'Ramesh Rao',
      village: 'Ward 14, Peruru',
      location: 'Near Panchayat Office',
      message: 'Cardiac discomfort & breathing difficulty',
      priority: 'critical',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vehicleNo: 'AP-39-AMB-108',
      eta: '4 mins',
    },
  ]);

  const [tickets, setTickets] = useState<AshaTicket[]>(SEED_TICKETS);
  const [orders, setOrders] = useState<HealthcareOrder[]>(SEED_ORDERS);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);

  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const s = io(API_BASE, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    s.on('connect', () => {
      console.log('⚡ Socket connected to backend real-time server');
      setIsConnected(true);
      if (role) {
        s.emit('join_role_room', role);
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time Event Listeners
    s.on('ambulance_location_stream', (stream: AmbulanceLocationStream) => {
      setActiveAmbulanceStream(stream);
    });

    s.on('emergency_sos_alert', (sosData: EmergencySosData) => {
      setActiveSosAlerts(prev => [sosData, ...prev]);
      toast.error(`🚨 EMERGENCY SOS: ${sosData.patientName} (${sosData.village})`, {
        duration: 8000,
        position: 'top-right',
      });
    });

    s.on('ticket_created', (ticket: AshaTicket) => {
      setTickets(prev => [ticket, ...prev.filter(t => t.id !== ticket.id)]);
      toast(`🎫 New ASHA Ticket: ${ticket.id}`, {
        icon: '📋',
        duration: 5000,
      });
    });

    s.on('ticket_updated', (updatedTicket: AshaTicket) => {
      setTickets(prev => prev.map(t => (t.id === updatedTicket.id ? updatedTicket : t)));
      toast.success(`🎫 Ticket ${updatedTicket.id} updated to '${updatedTicket.status.toUpperCase()}'`);
    });

    s.on('order_updated', (updatedOrder: HealthcareOrder) => {
      setOrders(prev => prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o)));
      toast.success(`📦 Order ${updatedOrder.orderNumber || updatedOrder.id} status: ${updatedOrder.status.replace(/_/g, ' ')}`);
    });

    s.on('cross_panel_toast', (notif: RealtimeToast) => {
      if (!notif.targetRole || notif.targetRole === role) {
        if (notif.type === 'critical') toast.error(`🚨 ${notif.title}: ${notif.message}`);
        else if (notif.type === 'warning') toast(`⚠️ ${notif.title}: ${notif.message}`, { icon: '⚠️' });
        else if (notif.type === 'success') toast.success(`${notif.title}: ${notif.message}`);
        else toast(`${notif.title}: ${notif.message}`, { icon: '🔔' });
      }
    });

    setSocket(s);

    // Fetch initial tickets from backend REST API
    fetch(`${API_BASE}/api/tickets`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tickets && data.tickets.length > 0) {
          setTickets(data.tickets);
        }
      })
      .catch(() => {});

    return () => {
      s.disconnect();
    };
  }, [role]);

  // Update room when role changes
  useEffect(() => {
    if (socket && isConnected && role) {
      socket.emit('join_role_room', role);
    }
  }, [role, socket, isConnected]);

  // Supabase Realtime Subscription (PostgreSQL CDC)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    try {
      const channel = supabase
        .channel('public_healthcare_tracking')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ambulance_dispatch' },
          (payload) => {
            if (payload.new) {
              const d = payload.new as any;
              setActiveAmbulanceStream({
                dispatchId: d.dispatch_id,
                lat: d.lat ?? 17.3850,
                lng: d.lng ?? 78.4867,
                speed: Number(d.speed_kmh) || 45,
                eta: Number(d.eta_minutes) || 4,
                status: d.status || 'en_route',
                vehicleNo: d.vehicle_no || 'AP-39-AMB-108',
                driverName: d.driver_name || 'Driver',
                patientName: d.patient_name || '',
                locationName: d.pickup_location || '',
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'issue_tickets' },
          (payload) => {
            if (payload.new) {
              const row = payload.new as any;
              const mapped: AshaTicket = {
                id: row.ticket_id,
                ashaName: row.asha_name,
                village: row.village,
                category: row.category,
                title: row.title,
                description: row.description,
                patientName: row.patient_name,
                priority: row.priority,
                status: row.status,
                createdAt: row.created_at || new Date().toISOString(),
                doctorNotes: row.doctor_notes,
                assignedDoctor: row.assigned_doctor,
              };
              setTickets(prev => {
                const exists = prev.some(t => t.id === mapped.id);
                return exists ? prev.map(t => (t.id === mapped.id ? mapped : t)) : [mapped, ...prev];
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            if (payload.new) {
              const row = payload.new as any;
              const mapped: HealthcareOrder = {
                id: row.id,
                orderNumber: row.payment_order_id || `ORD-${row.id.slice(0, 8)}`,
                patientName: row.user_name || 'Patient',
                items: Array.isArray(row.items) ? row.items : [],
                totalAmount: Number(row.total_amount) || 0,
                status: (row.status as any) || 'placed',
                deliveryAgent: 'Pharma Logistics',
                eta: '15 mins',
                createdAt: row.created_at || new Date().toISOString(),
              };
              setOrders(prev => {
                const exists = prev.some(o => o.id === mapped.id || o.orderNumber === mapped.orderNumber);
                return exists ? prev.map(o => (o.id === mapped.id ? mapped : o)) : [mapped, ...prev];
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('⚡ Supabase Realtime channel connected');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Supabase Realtime subscription notice:', err);
    }
  }, []);


  // Actions
  const triggerEmergencySos = useCallback((details: Partial<EmergencySosData>) => {
    const dispatchId = details.dispatchId || `EMR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSos: EmergencySosData = {
      dispatchId,
      patientName: details.patientName || 'Emergency Patient',
      village: details.village || 'Peruru Village',
      location: details.location || 'Home Location',
      message: details.message || 'Medical Emergency SOS',
      priority: details.priority || 'critical',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vehicleNo: 'AP-39-AMB-108',
      eta: '5 mins',
    };

    setActiveSosAlerts(prev => [newSos, ...prev]);

    if (socket) {
      socket.emit('trigger_emergency_sos', newSos);
    }
  }, [socket]);

  const updateAmbulanceLocation = useCallback((data: Partial<AmbulanceLocationStream>) => {
    setActiveAmbulanceStream(prev => {
      const updated: AmbulanceLocationStream = {
        dispatchId: data.dispatchId || prev?.dispatchId || 'EMR-2026-0412',
        lat: data.lat ?? prev?.lat ?? 17.3850,
        lng: data.lng ?? prev?.lng ?? 78.4867,
        speed: data.speed ?? prev?.speed ?? 45,
        eta: data.eta ?? prev?.eta ?? 3,
        status: data.status || prev?.status || 'en_route',
        vehicleNo: data.vehicleNo || prev?.vehicleNo || 'AP-39-AMB-108',
        driverName: data.driverName || prev?.driverName || 'Rajesh Kumar',
        patientName: data.patientName || prev?.patientName || 'Ramesh Rao',
        locationName: data.locationName || prev?.locationName || 'Ward 14, Peruru',
      };

      if (socket) {
        socket.emit('ambulance_location_update', updated);
      }

      return updated;
    });
  }, [socket]);

  // Simulated GPS streamer for Ambulance panel
  const startAmbulanceGpsBroadcast = useCallback((dispatchId: string) => {
    setIsBroadcastingGps(true);
    let step = 0;

    // Route points simulating movement toward patient
    const routePoints = [
      { lat: 17.3850, lng: 78.4867, eta: 5, speed: 42, status: 'en_route' as const },
      { lat: 17.3880, lng: 78.4890, eta: 4, speed: 50, status: 'en_route' as const },
      { lat: 17.3910, lng: 78.4915, eta: 3, speed: 46, status: 'en_route' as const },
      { lat: 17.3940, lng: 78.4940, eta: 2, speed: 38, status: 'arrived_scene' as const },
      { lat: 17.3970, lng: 78.4965, eta: 1, speed: 30, status: 'transporting' as const },
      { lat: 17.4000, lng: 78.4990, eta: 0, speed: 0,  status: 'arrived_hospital' as const },
    ];

    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);

    gpsIntervalRef.current = setInterval(() => {
      step = (step + 1) % routePoints.length;
      const pt = routePoints[step];
      updateAmbulanceLocation({
        dispatchId,
        lat: pt.lat,
        lng: pt.lng,
        eta: pt.eta,
        speed: pt.speed,
        status: pt.status,
      });
    }, 4000);
  }, [updateAmbulanceLocation]);

  const stopAmbulanceGpsBroadcast = useCallback(() => {
    setIsBroadcastingGps(false);
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  }, []);

  const createAshaTicket = useCallback(async (ticketData: Partial<AshaTicket>) => {
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTickets(prev => [data.ticket, ...prev]);
        if (socket) socket.emit('create_asha_ticket', data.ticket);
        return data.ticket;
      }
      return null;
    } catch {
      return null;
    }
  }, [socket]);

  const updateAshaTicket = useCallback(async (id: string, updates: Partial<AshaTicket>) => {
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTickets(prev => prev.map(t => (t.id === id ? data.ticket : t)));
        if (socket) socket.emit('update_asha_ticket', data.ticket);
      }
    } catch {}
  }, [socket]);

  const createOrder = useCallback(async (orderData: Partial<HealthcareOrder>) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newOrder: HealthcareOrder = {
      id: `ORD-2026-${randomNum}`,
      orderNumber: `ORD-2026-${randomNum}`,
      patientName: orderData.patientName || 'Patient',
      items: orderData.items || [{ name: 'Essential Health Kit', qty: 1, price: 250 }],
      totalAmount: orderData.totalAmount || 250,
      status: 'placed',
      deliveryAgent: 'Pharma Express Agent',
      eta: '30 mins',
      createdAt: new Date().toISOString(),
    };

    setOrders(prev => [newOrder, ...prev]);
    if (socket) socket.emit('update_order_status', newOrder);
    toast.success(`📦 Order Placed (${newOrder.orderNumber})`);
    return newOrder;
  }, [socket]);

  const updateOrderStatus = useCallback((id: string, status: HealthcareOrder['status']) => {
    setOrders(prev => {
      const updated = prev.map(o => (o.id === id ? { ...o, status } : o));
      const target = updated.find(o => o.id === id);
      if (target && socket) {
        socket.emit('update_order_status', target);
      }
      return updated;
    });
  }, [socket]);

  const sendCrossPanelToast = useCallback((toastData: Omit<RealtimeToast, 'id'>) => {
    const fullToast: RealtimeToast = { ...toastData, id: Date.now().toString() };
    if (socket) {
      socket.emit('send_cross_panel_toast', fullToast);
    }
  }, [socket]);

  return (
    <RealtimeContext.Provider
      value={{
        socket,
        isConnected,
        activeAmbulanceStream,
        activeSosAlerts,
        tickets,
        orders,
        isBroadcastingGps,
        triggerEmergencySos,
        updateAmbulanceLocation,
        startAmbulanceGpsBroadcast,
        stopAmbulanceGpsBroadcast,
        createAshaTicket,
        updateAshaTicket,
        createOrder,
        updateOrderStatus,
        sendCrossPanelToast,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
