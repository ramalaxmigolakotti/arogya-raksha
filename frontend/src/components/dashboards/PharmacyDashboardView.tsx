'use client';

import React, { useState } from 'react';
import {
  Pill, Package, Truck, CheckCircle2, Clock, Search,
  AlertTriangle, ShieldCheck, FileText, User, Building2,
  Phone, ArrowRight, ExternalLink, RefreshCw, Send, Check
} from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { useHealthcareJourney, HealthcareJourney } from '@/context/HealthcareJourneyContext';
import Link from 'next/link';

interface MedicineStock {
  name: string;
  generic: string;
  category: string;
  inStock: number;
  minThreshold: number;
  unitPrice: number;
}

export default function PharmacyDashboardView() {
  const { setRole, user } = useUserRole();
  const {
    journeys,
    verifyAndAcceptPrescription,
    packMedicines,
    dispatchMedicines,
    completeJourney,
  } = useHealthcareJourney();

  const [activeTab, setActiveTab] = useState<'prescriptions' | 'inventory'>('prescriptions');
  const [selectedJourney, setSelectedJourney] = useState<HealthcareJourney | null>(null);

  const [inventory, setInventory] = useState<MedicineStock[]>([
    { name: 'Telmisartan 40mg', generic: 'Telmisartan IP', category: 'Cardiovascular', inStock: 1420, minThreshold: 300, unitPrice: 4.5 },
    { name: 'Metformin 500mg SR', generic: 'Metformin Hydrochloride', category: 'Diabetes', inStock: 2890, minThreshold: 500, unitPrice: 2.8 },
    { name: 'Atorvastatin 10mg', generic: 'Atorvastatin Calcium', category: 'Lipid Lowering', inStock: 950, minThreshold: 200, unitPrice: 3.2 },
    { name: 'Amoxicillin 500mg', generic: 'Amoxicillin Trihydrate', category: 'Antibiotic', inStock: 80, minThreshold: 250, unitPrice: 6.0 },
    { name: 'Paracetamol 650mg (Dolo)', generic: 'Paracetamol IP', category: 'Antipyretic', inStock: 4500, minThreshold: 1000, unitPrice: 1.5 },
    { name: 'ORS Electrolyte Sachet', generic: 'WHO Formula ORS', category: 'Rehydration', inStock: 1200, minThreshold: 400, unitPrice: 18.0 },
    { name: 'Cetirizine 10mg', generic: 'Cetirizine HCl', category: 'Antihistamine', inStock: 1600, minThreshold: 300, unitPrice: 1.2 },
  ]);

  // Journeys that have reached prescription stage or later
  const rxJourneys = journeys.filter((j) =>
    ['prescribed', 'pharmacy_processing', 'medicines_packed', 'out_for_delivery', 'completed'].includes(
      j.currentStep
    )
  );

  const pendingRxCount = journeys.filter((j) => j.currentStep === 'prescribed').length;
  const inPreparationCount = journeys.filter((j) => j.currentStep === 'pharmacy_processing' || j.currentStep === 'medicines_packed').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Role Switch */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-bold text-emerald-400">Hospital Central Pharmacy</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                Jan Aushadhi & OPD Dispensing Hub
              </span>
            </div>
            <p className="text-sm text-slate-300 font-medium mt-0.5">
              Live Digital Prescription Stream • Stock Verification • Medicine Packaging • Rural Village Dispatch
            </p>
          </div>
        </div>

        {/* Quick Role Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setRole('hospital_admin')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Hospital Admin
          </button>
          <button
            onClick={() => setRole('doctor')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Doctor EHR
          </button>
          <button
            onClick={() => setRole('patient')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            Patient App
          </button>
        </div>
      </div>

      {/* Pharmacy Status Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Prescriptions</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{pendingRxCount + 2}</p>
          <p className="text-xs text-rose-600 font-bold mt-1">Awaiting Pharmacist Review</p>
        </div>

        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Packing / Prep</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2">{inPreparationCount + 5}</p>
          <p className="text-xs text-slate-500 mt-1">On Dispensing Counter</p>
        </div>

        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispatched Today</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-2">34 Orders</p>
          <p className="text-xs text-slate-500 mt-1">Village Deliveries & Pickups</p>
        </div>

        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-600 mt-2">
            {inventory.filter((i) => i.inStock < i.minThreshold).length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Amoxicillin 500mg (80 left)</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'prescriptions'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Digital Prescription Queue ({rxJourneys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Pill className="h-4 w-4" />
          <span>Pharmacy Inventory & Jan Aushadhi Stock</span>
        </button>
      </div>

      {/* TAB 1: DIGITAL PRESCRIPTION QUEUE */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of Prescriptions */}
            <div className="lg:col-span-2 space-y-4">
              {rxJourneys.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Pill className="h-7 w-7" />
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">Digital Prescription Queue is Clean</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No prescriptions pending dispensing right now. When an OPD doctor completes a consultation and prescribes medications, the order appears here for stock reservation and packaging.
                  </p>
                </div>
              ) : (
                rxJourneys.map((j) => {
                const rx = j.prescription;
                const isPending = j.currentStep === 'prescribed';
                const isProcessing = j.currentStep === 'pharmacy_processing';
                const isPacked = j.currentStep === 'medicines_packed';
                const isDispatched = j.currentStep === 'out_for_delivery';
                const isCompleted = j.currentStep === 'completed';

                return (
                  <div
                    key={j.id}
                    className={`bg-white rounded-3xl p-6 border transition-all space-y-4 ${
                      selectedJourney?.id === j.id
                        ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-500/20'
                        : 'border-slate-200/80 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                          <Pill className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black font-mono text-slate-900">
                              {rx?.id || 'RX-PENDING'}
                            </span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                              Token #{j.tokenNumber}
                            </span>
                            {j.ashaWorkerName && (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                                Village: {j.village}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-black text-slate-900 mt-0.5">
                            {j.patientName} ({j.age} yrs • {j.gender})
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
                            isPending
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              : isProcessing
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : isPacked
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : isDispatched
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {j.currentStep.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Prescribing Doctor & Diagnosis */}
                    <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-1.5">
                      <p className="text-slate-500">
                        Prescribed by: <strong className="text-slate-900">{j.doctorName}</strong> ({j.hospitalName})
                      </p>
                      <p className="text-slate-500">
                        Diagnosis: <strong className="text-indigo-700">{rx?.diagnosis || 'Clinical OPD Evaluation'}</strong>
                      </p>
                      {rx?.instructions && (
                        <p className="text-slate-600 italic">"{rx.instructions}"</p>
                      )}
                    </div>

                    {/* Medicines List */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Medications to Dispense:
                      </p>
                      <div className="space-y-2">
                        {rx?.medicines.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 text-xs"
                          >
                            <div>
                              <p className="font-extrabold text-slate-900">{m.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {m.dosage} • {m.frequency} • {m.duration}
                              </p>
                            </div>
                            <span className="font-bold text-slate-900">
                              {m.price > 0 ? `₹${m.price}` : 'FREE (Govt)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dispensing Action Pipeline Buttons */}
                    <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={() => setSelectedJourney(j)}
                        className="text-xs text-emerald-600 font-extrabold hover:underline flex items-center gap-1"
                      >
                        <span>Inspect Full EMR</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <button
                            onClick={() => verifyAndAcceptPrescription(j.id)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>1. Verify Stock & Accept</span>
                          </button>
                        )}

                        {isProcessing && (
                          <button
                            onClick={() => packMedicines(j.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <Package className="h-3.5 w-3.5" />
                            <span>2. Pack & Label Medicines</span>
                          </button>
                        )}

                        {isPacked && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => dispatchMedicines(j.id, 'village_delivery')}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Dispatch to Village</span>
                            </button>
                            <button
                              onClick={() => dispatchMedicines(j.id, 'counter_pickup')}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
                            >
                              Counter Ready
                            </button>
                          </div>
                        )}

                        {isDispatched && (
                          <button
                            onClick={() => completeJourney(j.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Handover & Complete</span>
                          </button>
                        )}

                        {isCompleted && (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Dispensed & Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>

            {/* Right Side: Quick Dispenser Instructions & Summary */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 rounded-2xl text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Digital Pharmacy Protocol</h3>
                    <p className="text-xs text-emerald-300">NABH & Jan Aushadhi Standards</p>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-2.5 pt-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</span>
                    <p>Every digital prescription from OPD doctors is securely tokenized.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
                    <p>Stock is automatically reserved upon clicking <strong>Verify Stock</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</span>
                    <p>Rural patients via ASHA receive real-time SMS & WhatsApp alerts when packed.</p>
                  </div>
                </div>
              </div>

              {/* Delivery Desk Contact */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900">Rural Village Courier Hub</h4>
                <p className="text-xs text-slate-500">
                  Medicines for Kothapeta & Peruru villages depart twice daily at 12:00 PM and 5:00 PM.
                </p>
                <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-700 font-mono space-y-1">
                  <p><strong>Courier:</strong> Arogya Gramin Express</p>
                  <p><strong>Vehicle:</strong> AP-21-TX-4402</p>
                  <p><strong>Driver:</strong> Venkat Reddy (+91 98480 88221)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY MONITOR */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">Pharmacy Inventory & Jan Aushadhi Stock</h3>
              <p className="text-xs text-slate-500 font-medium">
                Live monitoring of essential outpatient medications and automatic reorder thresholds
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 rounded-l-xl">Medicine Name</th>
                  <th className="py-3 px-4">Generic Composition</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">In Stock</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {inventory.map((item, idx) => {
                  const isLow = item.inStock < item.minThreshold;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">{item.name}</td>
                      <td className="py-3.5 px-4 text-slate-500">{item.generic}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{item.category}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {item.inStock} units
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {isLow ? (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]">
                            Low Stock (Reorder)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                            Adequate Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
