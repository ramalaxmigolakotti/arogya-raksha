'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cachedFetch } from '@/lib/apiCache';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, User, Activity, AlertTriangle, Syringe, Baby, HeartPulse, CheckCircle2, Languages } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PatientProfile() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [patient, setPatient] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [sugar, setSugar] = useState('');
  const [weight, setWeight] = useState('');
  const [pregnancy, setPregnancy] = useState('Not Pregnant');
  const [vaccinations, setVaccinations] = useState('');
  const [notes, setNotes] = useState('');
  const [language, setLanguage] = useState('Hindi');

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const res = await cachedFetch<any>(`${API}/api/asha/patients/${id}`, {}, 0);
      if (res.success) {
        setPatient(res.patient);
        setRecords(res.records);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API}/api/asha/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          patient_id: id,
          bp_systolic: bpSys ? parseInt(bpSys) : null,
          bp_diastolic: bpDia ? parseInt(bpDia) : null,
          sugar_level: sugar ? parseFloat(sugar) : null,
          weight: weight ? parseFloat(weight) : null,
          pregnancy_status: pregnancy,
          vaccinations: vaccinations.split(',').map(v => v.trim()).filter(v => v),
          notes,
          language
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Vitals recorded! AI Analysis Complete.');
        // Reset form
        setBpSys(''); setBpDia(''); setSugar(''); setWeight(''); setVaccinations(''); setNotes('');
        // Reload records
        load();
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to record vitals');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400">Loading patient profile...</div>;
  if (!patient) return <div className="p-12 text-center text-slate-500">Patient not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Link href="/dashboard/asha/patients" className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-semibold text-sm transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Patient Info & Vitals Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Patient Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 border border-rose-100">
              <User className="h-8 w-8 text-rose-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">{patient.full_name}</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">{patient.age} yrs • {patient.gender} • {patient.village_name}</p>
            
            {patient.phone && (
              <p className="text-slate-600 text-sm mt-3 bg-slate-50 px-3 py-2 rounded-xl inline-block border border-slate-100">📞 {patient.phone}</p>
            )}

            {patient.medical_history && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medical History</p>
                <p className="text-sm text-slate-600 bg-orange-50/50 p-3 rounded-xl border border-orange-100">{patient.medical_history}</p>
              </div>
            )}
          </div>

          {/* Record New Vitals Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-800 mb-5 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" /> Log New Vitals
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">BP Sys (mmHg)</label>
                  <input type="number" value={bpSys} onChange={e=>setBpSys(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="120" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">BP Dia (mmHg)</label>
                  <input type="number" value={bpDia} onChange={e=>setBpDia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="80" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sugar (mg/dL)</label>
                  <input type="number" step="0.1" value={sugar} onChange={e=>setSugar(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="95.5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="65" />
                </div>
              </div>

              {patient.gender !== 'Male' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pregnancy Status</label>
                  <select value={pregnancy} onChange={e=>setPregnancy(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option>Not Pregnant</option>
                    <option>Trimester 1</option>
                    <option>Trimester 2</option>
                    <option>Trimester 3</option>
                    <option>Postpartum</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Vaccinations Given (comma separated)</label>
                <input type="text" value={vaccinations} onChange={e=>setVaccinations(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Polio, BCG" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Local Language for AI Translation</label>
                <select value={language} onChange={e=>setLanguage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option>Hindi</option>
                  <option>Telugu</option>
                  <option>Tamil</option>
                  <option>Kannada</option>
                  <option>Marathi</option>
                  <option>Bengali</option>
                </select>
              </div>

              <button disabled={submitting || (!bpSys && !sugar && !weight && !vaccinations)} className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 mt-4">
                {submitting ? 'Analyzing via AI...' : 'Save & Analyze'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: History & AI Alerts */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Vitals History & AI Insights</h2>
          
          {records.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeartPulse className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-600 mb-1">No records yet</h3>
              <p className="text-sm text-slate-500">Log vitals on the left to see history and AI analysis.</p>
            </div>
          ) : (
            records.map((record) => (
              <div key={record.id} className={`bg-white rounded-3xl border ${record.ai_risk_flag ? 'border-red-200 shadow-red-500/10' : 'border-slate-200'} p-6 shadow-sm overflow-hidden relative`}>
                {record.ai_risk_flag && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
                    High Risk
                  </div>
                )}
                
                <p className="text-xs font-semibold text-slate-400 mb-4">{new Date(record.created_at).toLocaleString()}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {(record.bp_systolic || record.bp_diastolic) && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Blood Pressure</p>
                      <p className={`text-lg font-black ${record.bp_systolic > 140 || record.bp_diastolic > 90 ? 'text-red-600' : 'text-slate-800'}`}>{record.bp_systolic}/{record.bp_diastolic}</p>
                    </div>
                  )}
                  {record.sugar_level && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Blood Sugar</p>
                      <p className="text-lg font-black text-slate-800">{record.sugar_level} <span className="text-xs font-medium text-slate-500">mg/dL</span></p>
                    </div>
                  )}
                  {record.weight && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Weight</p>
                      <p className="text-lg font-black text-slate-800">{record.weight} <span className="text-xs font-medium text-slate-500">kg</span></p>
                    </div>
                  )}
                  {record.pregnancy_status && record.pregnancy_status !== 'Not Pregnant' && (
                    <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
                      <p className="text-[10px] font-bold text-pink-500 uppercase">Pregnancy</p>
                      <p className="text-sm font-bold text-pink-700 mt-1">{record.pregnancy_status}</p>
                    </div>
                  )}
                </div>

                {record.vaccinations && record.vaccinations.length > 0 && (
                  <div className="mb-5 flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-teal-500" />
                    <span className="text-sm font-semibold text-slate-700">Vaccines given:</span>
                    <div className="flex gap-2">
                      {record.vaccinations.map((v: string, i: number) => (
                        <span key={i} className="text-xs font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-100">{v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis Block */}
                {record.ai_analysis && Object.keys(record.ai_analysis).length > 0 && (
                  <div className={`mt-4 rounded-2xl p-5 border ${record.ai_risk_flag ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                    <div className="flex items-start gap-3">
                      {record.ai_risk_flag ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="space-y-3 flex-1">
                        <div>
                          <p className={`text-xs font-black uppercase tracking-wider mb-1 ${record.ai_risk_flag ? 'text-red-700' : 'text-emerald-700'}`}>
                            {record.ai_risk_flag ? 'AI Warning' : 'AI Assessment'}
                          </p>
                          <p className="text-sm text-slate-700 font-medium">{record.ai_analysis.reason}</p>
                          {record.ai_analysis.follow_up && (
                            <p className="text-sm text-slate-800 font-bold mt-1.5 flex items-center gap-2">
                              <span className="bg-white p-1 rounded-md shadow-sm">👉</span> {record.ai_analysis.follow_up}
                            </p>
                          )}
                        </div>

                        {/* Local Translation */}
                        {record.ai_analysis.translation && (
                          <div className={`pt-3 border-t ${record.ai_risk_flag ? 'border-red-200/50' : 'border-emerald-200/50'}`}>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <Languages className="h-3 w-3" /> Local Language Translation
                            </p>
                            <p className="text-sm text-slate-700 font-medium">{record.ai_analysis.translation.reason}</p>
                            {record.ai_analysis.translation.follow_up && (
                              <p className="text-sm font-bold text-slate-800 mt-1">{record.ai_analysis.translation.follow_up}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
