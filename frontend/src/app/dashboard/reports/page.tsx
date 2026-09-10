'use client';

import { FileText, Download, Eye, Sparkles, PlusSquare, FileUp } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function MedicalReports() {
  const { t, language } = useLanguage();
  const reports = [
    {
      id: 1,
      title: 'Complete Blood Count (CBC)',
      date: 'Oct 12, 2023',
      lab: 'Dr. Lal PathLabs',
      aiAnalysis: 'Normal. Hemoglobin is within healthy range (14.2 g/dL). No signs of infection.',
      status: 'Analyzed'
    },
    {
      id: 2,
      title: 'Chest X-Ray',
      date: 'Sep 05, 2023',
      lab: 'Apollo Diag',
      aiAnalysis: 'Clear. No visible abnormalities in the lung fields or pleural spaces.',
      status: 'Analyzed'
    },
    {
      id: 3,
      title: 'Lipid Profile',
      date: 'Aug 20, 2023',
      lab: 'Metropolis',
      aiAnalysis: 'Borderline high LDL cholesterol (135 mg/dL). Diet adjustment recommended.',
      status: 'Action Required'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Medical Reports</h1>
          <p className="text-slate-500 mt-1 font-medium text-lg">Securely store and intelligently analyze your lab results.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5">
          <FileUp className="h-5 w-5" />
          Upload New Report
        </button>
      </header>

      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-500/5">
         <div>
            <h2 className="text-xl font-black text-emerald-800 mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Arogya AI Report Analysis
            </h2>
            <p className="text-emerald-700 font-medium max-w-2xl text-sm leading-relaxed">
              Upload your lab reports (PDF/JPG) and Arogya AI will automatically extract the data, compare it against your medical history, and provide a simplified summary of the findings in seconds.
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6 w-full">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-emerald-200 transition-colors flex flex-col lg:flex-row gap-6 items-start lg:items-center">
             
             <div className="flex-shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <FileText className="h-8 w-8 text-slate-400" />
             </div>

             <div className="flex-1 w-full lg:w-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                   <h3 className="text-lg font-bold text-slate-900">{report.title}</h3>
                   <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${report.status === 'Analyzed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                     {report.status}
                   </span>
                </div>
                <p className="text-sm font-medium text-slate-500 mb-4">{report.lab} • {report.date}</p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <p className="text-sm font-semibold text-slate-700 flex items-start gap-2">
                     <Sparkles className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                     {report.aiAnalysis}
                   </p>
                </div>
             </div>

             <div className="flex gap-3 w-full lg:w-auto">
                 <button className="flex-1 lg:flex-none px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2">
                    <Eye className="h-4 w-4" /> View
                 </button>
                 <button className="flex-1 lg:flex-none px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" /> Save
                 </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
