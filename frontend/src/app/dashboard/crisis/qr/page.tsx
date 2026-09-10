'use client';

import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode, Download, Printer, Plus, Trash2,
  Building2, MapPin, Copy, CheckCircle2, AlertTriangle
} from 'lucide-react';

// Dynamically use current domain — works in production and local dev
const BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_BASE_URL || 'https://arogya-rho.vercel.app');


interface RoomConfig {
  id: string;
  room: string;
  floor: string;
  hotelId: string;
  label: string;
}

const DEFAULT_ROOMS: RoomConfig[] = [
  { id: '1', room: '101', floor: '1', hotelId: 'HOTEL_001', label: 'Room 101 — Floor 1' },
  { id: '2', room: '201', floor: '2', hotelId: 'HOTEL_001', label: 'Room 201 — Floor 2' },
  { id: '3', room: '305', floor: '3', hotelId: 'HOTEL_001', label: 'Room 305 — Floor 3' },
];

function getQrUrl(r: RoomConfig) {
  return `${BASE_URL}/crisis/report?room=${r.room}&floor=${r.floor}&hotel=${r.hotelId}`;
}

export default function QrGeneratorPage() {
  const [rooms, setRooms] = useState<RoomConfig[]>(DEFAULT_ROOMS);
  const [hotelId, setHotelId] = useState('HOTEL_001');
  const [hotelName, setHotelName] = useState('Grand Hotel');
  const [newRoom, setNewRoom] = useState('');
  const [newFloor, setNewFloor] = useState('');
  const [selected, setSelected] = useState<RoomConfig | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [bulkFrom, setBulkFrom] = useState('');
  const [bulkTo, setBulkTo] = useState('');
  const [bulkFloor, setBulkFloor] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const addRoom = () => {
    if (!newRoom.trim()) return;
    const r: RoomConfig = {
      id: Date.now().toString(),
      room: newRoom.trim(),
      floor: newFloor.trim() || '1',
      hotelId,
      label: `Room ${newRoom.trim()} — Floor ${newFloor.trim() || '1'}`,
    };
    setRooms(prev => [...prev, r]);
    setNewRoom('');
    setNewFloor('');
  };

  const addBulk = () => {
    const from = parseInt(bulkFrom);
    const to = parseInt(bulkTo);
    const floor = bulkFloor.trim() || '?';
    if (isNaN(from) || isNaN(to) || from > to) return;
    const newRooms: RoomConfig[] = [];
    for (let n = from; n <= to; n++) {
      newRooms.push({
        id: `${Date.now()}-${n}`,
        room: String(n),
        floor,
        hotelId,
        label: `Room ${n} — Floor ${floor}`,
      });
    }
    setRooms(prev => [...prev, ...newRooms]);
    setBulkFrom(''); setBulkTo(''); setBulkFloor('');
  };

  const removeRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const copyUrl = (r: RoomConfig) => {
    navigator.clipboard.writeText(getQrUrl(r));
    setCopied(r.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const printQr = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>QR Codes — ${hotelName}</title>
      <style>
        body { font-family: sans-serif; margin: 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 24px; }
        .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; page-break-inside: avoid; }
        .hotel { font-size: 11px; color: #64748b; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
        .room  { font-size: 20px; font-weight: 900; color: #0f172a; margin: 6px 0 2px; }
        .floor { font-size: 12px; color: #64748b; margin-bottom: 12px; }
        .warn  { font-size: 11px; color: #dc2626; font-weight: 700; margin-top: 10px; }
        svg    { display: block; margin: 0 auto; }
        @media print { .grid { grid-template-columns: repeat(3, 1fr); } }
      </style></head>
      <body><div class="grid">${content}</div></body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 border border-indigo-200">
            <QrCode className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">QR Code Generator</h1>
            <p className="text-sm text-slate-500">Generate & print room QR codes for instant guest SOS</p>
          </div>
        </div>
        <button onClick={printQr}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-105">
          <Printer className="h-4 w-4" /> Print All QR Codes
        </button>
      </header>

      {/* How it works banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <strong>How it works:</strong> Each QR code encodes a URL like{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">
            /crisis/report?room=305&floor=3&hotel=HOTEL_001
          </code>
          {' '}— when a guest scans it, the SOS form opens with room & floor pre-filled automatically.
          Print these and place one in every hotel room.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── LEFT: Config + Room List ── */}
        <div className="xl:col-span-1 space-y-4">

          {/* Hotel config */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-indigo-500" /> Hotel Settings
            </h2>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Hotel Name</label>
              <input value={hotelName} onChange={e => setHotelName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="Grand Hotel" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Hotel ID</label>
              <input value={hotelId} onChange={e => setHotelId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="HOTEL_001" />
            </div>
          </div>

          {/* Add single room */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-emerald-500" /> Add Room
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Room No.</label>
                <input value={newRoom} onChange={e => setNewRoom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRoom()}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="305" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Floor</label>
                <input value={newFloor} onChange={e => setNewFloor(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRoom()}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="3" />
              </div>
            </div>
            <button onClick={addRoom}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors">
              <Plus className="h-4 w-4 inline mr-1" /> Add Room
            </button>
          </div>

          {/* Bulk add */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Bulk Add (Range)</h2>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">From</label>
                <input value={bulkFrom} onChange={e => setBulkFrom(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-center"
                  placeholder="101" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">To</label>
                <input value={bulkTo} onChange={e => setBulkTo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-center"
                  placeholder="110" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Floor</label>
                <input value={bulkFloor} onChange={e => setBulkFloor(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-center"
                  placeholder="1" />
              </div>
            </div>
            <button onClick={addBulk}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors">
              Generate Range
            </button>
          </div>

          {/* Room list */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Rooms <span className="text-indigo-600 ml-1">{rooms.length}</span>
              </h2>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {rooms.map(r => (
                <div key={r.id}
                  onClick={() => setSelected(r)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50 border ${
                    selected?.id === r.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100'
                  }`}>
                  <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">Room {r.room}</p>
                    <p className="text-xs text-slate-500">Floor {r.floor}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); copyUrl(r); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    {copied === r.id
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeRoom(r.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: QR Preview + Grid ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Single QR preview */}
          {selected && (
            <div className="bg-white rounded-2xl p-6 border border-indigo-200 shadow-sm text-center space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Preview — Room {selected.room}</h2>
                <button onClick={() => copyUrl(selected)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors">
                  {copied === selected.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy URL
                </button>
              </div>
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl border-2 border-slate-200 bg-white inline-block">
                  <QRCodeSVG
                    value={getQrUrl(selected)}
                    size={220}
                    level="H"
                    includeMargin
                    imageSettings={{
                      src: '/favicon.ico',
                      height: 32,
                      width: 32,
                      excavate: true,
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">{hotelName}</p>
                <p className="text-sm font-bold text-slate-600">Room {selected.room} · Floor {selected.floor}</p>
                <p className="text-xs text-red-600 font-bold mt-1">🚨 Scan for Emergency Help</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono text-slate-500 break-all border border-slate-200">
                {getQrUrl(selected)}
              </div>
              <a href={getQrUrl(selected)} target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors">
                <AlertTriangle className="h-4 w-4" /> Test SOS Link →
              </a>
            </div>
          )}

          {/* Printable QR Grid */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Printable Grid — {rooms.length} codes
              </h2>
              <button onClick={printQr}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>

            {/* Hidden print-ready content */}
            <div ref={printRef} className="hidden">
              {rooms.map(r => (
                <div key={r.id} className="card">
                  <p className="hotel">{hotelId}</p>
                  <p className="room">Room {r.room}</p>
                  <p className="floor">Floor {r.floor}</p>
                  <QRCodeSVG value={getQrUrl(r)} size={140} level="H" includeMargin />
                  <p className="warn">🚨 Scan for Emergency Help</p>
                </div>
              ))}
            </div>

            {/* Visible grid preview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {rooms.map(r => (
                <button key={r.id}
                  onClick={() => setSelected(r)}
                  className={`p-3 rounded-xl border text-center transition-all hover:shadow-md ${
                    selected?.id === r.id ? 'border-indigo-400 ring-2 ring-indigo-300/40 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'
                  }`}>
                  <div className="flex justify-center mb-2">
                    <QRCodeSVG value={getQrUrl(r)} size={80} level="M" includeMargin={false} />
                  </div>
                  <p className="text-xs font-black text-slate-900">Room {r.room}</p>
                  <p className="text-[10px] text-slate-500">Floor {r.floor}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
