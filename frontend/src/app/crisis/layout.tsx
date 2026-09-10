// Standalone layout for guest-facing crisis pages
// No sidebar, no header — full screen experience
export default function CrisisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
