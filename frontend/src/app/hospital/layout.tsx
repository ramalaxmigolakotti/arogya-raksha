// Standalone layout for hospital portal — no sidebar (hospitals are external)
export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
