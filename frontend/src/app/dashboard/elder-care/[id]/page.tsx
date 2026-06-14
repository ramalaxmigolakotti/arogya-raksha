'use client';
import React from 'react';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronLeft, Heart, MapPin, Phone, Pill, Calendar, Activity,
  HeartHandshake, Bell, Check, Clock, Plus, AlertTriangle,
  CheckCircle2, Loader2, Stethoscope, Truck, X, Edit3
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Task {
  id: string;
  task_type: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  done_at?: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  source: string;
  is_read: boolean;
  created_at: string;
}

const taskTypeIcon: Record<string, React.ReactElement> = {
  medicine_delivery: <Pill className="h-4 w-4 text-emerald-500" />,
  doctor_booking: <Calendar className="h-4 w-4 text-blue-500" />,
  hospital_accompany: <Stethoscope className="h-4 w-4 text-violet-500" />,
  health_check: <Activity className="h-4 w-4 text-rose-500" />,
  other: <Heart className="h-4 w-4 text-orange-400" />,
};

const severityConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
};

export default function ElderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [elder, setElder] = useState<any>(null);
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', task_type: 'other', description: '', due_date: '' });
  const [addingTask, setAddingTask] = useState(false);
  const [tab, setTab] = useState<'tasks' | 'alerts' | 'info'>('tasks');

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`${API}/api/elder-care/elders/${id}`, {
      headers: { 'x-user-id': user?.id || '' },
    });
    const data = await res.json();
    if (data.success) {
      setElder(data.elder);
      setActiveMatch(data.active_match);
      setTasks(data.tasks || []);
      setAlerts(data.alerts || []);
    }
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => { load(); }, [load]);

  const markDone = async (taskId: string) => {
    setMarkingDone(taskId);
    try {
      await fetch(`${API}/api/elder-care/tasks/${taskId}/done`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ done_notes: '' }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t));
    } finally {
      setMarkingDone(null);
    }
  };

  const markAlertRead = async (alertId: string) => {
    await fetch(`${API}/api/elder-care/alerts/${alertId}/read`, {
      method: 'PUT',
      headers: { 'x-user-id': user?.id || '' },
    });
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
  };

  const addTask = async () => {
    if (!newTask.title || !activeMatch) return;
    setAddingTask(true);
    try {
      const res = await fetch(`${API}/api/elder-care/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          match_id: activeMatch.id,
          elder_id: id,
          caregiver_id: activeMatch.caregiver?.id,
          ...newTask,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => [data.task, ...prev]);
        setNewTask({ title: '', task_type: 'other', description: '', due_date: '' });
        setShowAddTask(false);
      }
    } finally {
      setAddingTask(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto pt-16 flex items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
        <span className="text-slate-500 font-medium">Loading elder profile...</span>
      </div>
    );
  }

  if (!elder) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <p className="text-slate-600 font-bold">Elder not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-orange-600 font-bold hover:underline">← Go Back</button>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-extrabold text-slate-900">Elder Profile</h1>
      </div>

      {/* Elder Card */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-200 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-full blur-2xl opacity-50 -mr-10 -mt-10" />
        <div className="relative z-10 flex items-start gap-5">
          {elder.photo_url ? (
            <img src={elder.photo_url} alt={elder.full_name}
              className="h-20 w-20 rounded-2xl object-cover border-4 border-white shadow-xl flex-shrink-0" />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-200 border-4 border-white shadow-xl flex items-center justify-center text-4xl flex-shrink-0">
              👴
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold text-slate-900">{elder.full_name}</h2>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {elder.age} years • {elder.address}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(elder.conditions || []).map((c: string, i: number) => (
                <span key={i} className="text-xs font-bold bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full border border-rose-200">
                  {c}
                </span>
              ))}
              <span className="text-xs font-bold bg-white text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200 capitalize">
                {elder.mobility}
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/70 backdrop-blur rounded-xl p-3 text-center border border-orange-100">
            <p className="text-lg font-extrabold text-slate-800">{pendingTasks.length}</p>
            <p className="text-xs text-slate-500 font-medium">Pending Tasks</p>
          </div>
          <div className="bg-white/70 backdrop-blur rounded-xl p-3 text-center border border-orange-100">
            <p className="text-lg font-extrabold text-slate-800">{doneTasks.length}</p>
            <p className="text-xs text-slate-500 font-medium">Tasks Done</p>
          </div>
          <div className="bg-white/70 backdrop-blur rounded-xl p-3 text-center border border-orange-100">
            <p className="text-lg font-extrabold text-red-500">{unreadAlerts.length}</p>
            <p className="text-xs text-slate-500 font-medium">Active Alerts</p>
          </div>
        </div>
      </div>

      {/* Active Caregiver */}
      {activeMatch ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-lg shadow-emerald-50">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {activeMatch.caregiver?.photo_url ? (
                <img src={activeMatch.caregiver.photo_url} alt="Caregiver"
                  className="h-12 w-12 rounded-xl object-cover border-2 border-emerald-200" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-xl">
                  👩‍⚕️
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-0.5">Active Caregiver</p>
              <h3 className="font-extrabold text-slate-800">{activeMatch.caregiver?.full_name}</h3>
              <p className="text-xs text-slate-500">{activeMatch.caregiver?.village}, {activeMatch.caregiver?.city}</p>
            </div>
            {activeMatch.caregiver?.phone && (
              <a href={`tel:${activeMatch.caregiver.phone}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors">
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
          </div>
        </div>
      ) : (
        <Link href={`/dashboard/elder-care/matches?elder=${id}`}
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors group">
          <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <HeartHandshake className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800">No caregiver assigned yet</p>
            <p className="text-xs text-amber-600">Click to find and hire a matched caregiver →</p>
          </div>
        </Link>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
        {([
          { key: 'tasks', label: 'Tasks', count: pendingTasks.length },
          { key: 'alerts', label: 'Alerts', count: unreadAlerts.length },
          { key: 'info', label: 'Info', count: null },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tasks Tab ── */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800">Caregiver Tasks</h3>
            {activeMatch && (
              <button onClick={() => setShowAddTask(!showAddTask)}
                className="flex items-center gap-1.5 text-sm text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-colors">
                <Plus className="h-4 w-4" /> Add Task
              </button>
            )}
          </div>

          {/* Add Task Form */}
          {showAddTask && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-orange-200 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="grid grid-cols-2 gap-3">
                <select value={newTask.task_type} onChange={e => setNewTask(n => ({ ...n, task_type: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="medicine_delivery">💊 Medicine Delivery</option>
                  <option value="doctor_booking">📅 Doctor Booking</option>
                  <option value="hospital_accompany">🏥 Hospital Visit</option>
                  <option value="health_check">❤️ Health Check</option>
                  <option value="other">📝 Other</option>
                </select>
                <input type="date" value={newTask.due_date} onChange={e => setNewTask(n => ({ ...n, due_date: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <input value={newTask.title} onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))}
                placeholder="Task title..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <textarea value={newTask.description} onChange={e => setNewTask(n => ({ ...n, description: e.target.value }))}
                placeholder="Description (optional)..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              <div className="flex gap-2">
                <button onClick={addTask} disabled={addingTask || !newTask.title}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white font-bold text-sm rounded-xl disabled:opacity-60 hover:bg-orange-600 transition-colors">
                  {addingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {addingTask ? 'Adding...' : 'Add Task'}
                </button>
                <button onClick={() => setShowAddTask(false)}
                  className="px-4 py-2.5 text-slate-500 font-bold text-sm rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {tasks.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm text-slate-500">No tasks assigned yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <motion.div key={task.id} custom={i} initial="hidden" animate="visible"
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.05 } } }}
                  className={`bg-white rounded-xl border p-4 flex items-start gap-3 shadow-sm ${
                    task.status === 'done' ? 'border-emerald-100 opacity-70' : 'border-slate-100'
                  }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {taskTypeIcon[task.task_type] || taskTypeIcon.other}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Due: {new Date(task.due_date).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                  {task.status === 'done' ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex-shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </span>
                  ) : (
                    <button onClick={() => markDone(task.id)} disabled={markingDone === task.id}
                      className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors disabled:opacity-60">
                      {markingDone === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Done
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Alerts Tab ── */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-800">Health Alerts</h3>
          {alerts.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No alerts — elder is doing well!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, i) => {
                const cfg = severityConfig[alert.severity] || severityConfig.low;
                return (
                  <div key={alert.id}
                    className={`rounded-xl border p-4 flex items-start gap-3 ${cfg.bg} ${cfg.border} ${alert.is_read ? 'opacity-60' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${cfg.text}`}>{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {alert.source} • {new Date(alert.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!alert.is_read && (
                      <button onClick={() => markAlertRead(alert.id)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${cfg.text} bg-white/60 hover:bg-white transition-colors flex-shrink-0`}>
                        Dismiss
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Info Tab ── */}
      {tab === 'info' && (
        <div className="space-y-4">
          {/* Medicine Schedule */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <Pill className="h-4 w-4 text-emerald-500" /> Medicine Schedule
            </h3>
            {(elder.medicine_schedule || []).length === 0 ? (
              <p className="text-sm text-slate-400">No medicines added</p>
            ) : (
              <div className="space-y-2">
                {elder.medicine_schedule.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-100">
                    <span className="font-bold text-slate-800 text-sm">{m.name}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-bold text-emerald-700">{m.dose}</span>
                      <span>{m.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Contacts */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" /> Emergency Contacts
            </h3>
            {(elder.emergency_contacts || []).length === 0 ? (
              <p className="text-sm text-slate-400">No contacts added</p>
            ) : (
              <div className="space-y-2">
                {elder.emergency_contacts.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.relation}</p>
                    </div>
                    <a href={`tel:${c.phone}`}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Special Notes */}
          {elder.special_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <h3 className="font-bold text-amber-800 text-sm mb-1.5 flex items-center gap-1.5">
                <Edit3 className="h-4 w-4" /> Special Notes
              </h3>
              <p className="text-sm text-amber-700">{elder.special_notes}</p>
            </div>
          )}

          {/* Integration links */}
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/dashboard/appointments?elder=${id}`}
              className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-3 hover:shadow-md transition-all text-sm font-bold text-slate-700">
              <Calendar className="h-4 w-4 text-blue-500" /> Book Appointment
            </Link>
            <Link href="/dashboard/medicines"
              className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-3 hover:shadow-md transition-all text-sm font-bold text-slate-700">
              <Pill className="h-4 w-4 text-emerald-500" /> Find Medicines
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
