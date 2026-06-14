import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface ConnectedFeature {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  reason: string;
  color: string;
  bg: string;
}

interface AIFeatureConnectorProps {
  title?: string;
  features: ConnectedFeature[];
}

export default function AIFeatureConnector({ title = "AI-Recommended Connected Features", features }: AIFeatureConnectorProps) {
  if (!features || features.length === 0) return null;

  return (
    <div className="mt-12 bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 bg-emerald-100 rounded-xl">
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800">{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {features.map((feature, i) => (
          <Link 
            key={i} 
            href={feature.href}
            className="group flex flex-col bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl p-5 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${feature.bg}`}>
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </div>
            
            <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{feature.title}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{feature.description}</p>
            
            <div className="mt-auto pt-4 border-t border-slate-50">
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-emerald-700 italic leading-snug">
                  {feature.reason}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
