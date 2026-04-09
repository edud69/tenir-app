import { ReactNode } from 'react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

interface AuthLayoutProps {
  children: ReactNode;
}

const features = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="m10 13-2 2 2 2"/><path d="m14 13 2 2-2 2"/>
      </svg>
    ),
    title: 'AI Receipt Scanning',
    desc: 'Automatically extract vendor, amount, and category from any receipt.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: 'GRIP & CDA Tracking',
    desc: 'Real-time capital dividend account and GRIP balance monitoring.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: 'T2 & CO-17 Generation',
    desc: 'Generate federal and Quebec corporate tax forms in minutes.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
    title: 'Tax Integration Model',
    desc: 'Compare salary vs dividend strategies with combined federal/Quebec rates.',
  },
];

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] bg-slate-950 flex-col justify-between p-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-tenir-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-600/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-tenir-500 flex items-center justify-center">
              <span className="text-white font-bold text-base">T</span>
            </div>
            <span className="font-semibold text-white text-lg tracking-tight">
              tenir<span className="text-tenir-400">.app</span>
            </span>
          </div>
        </div>

        {/* Middle content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-4">
            Comptabilité<br/>
            <span className="text-tenir-400">intelligente</span> pour<br/>
            votre société.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-xs">
            La plateforme tout-en-un pour gérer votre comptabilité corporative au Québec.
          </p>

          <div className="space-y-5">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-tenir-400 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-white leading-snug">{f.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} tenir.app — Conçu pour les sociétés de portefeuille québécoises
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white relative">
        {/* Language switcher */}
        <div className="absolute top-5 right-5">
          <LanguageSwitcher />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-tenir-500 flex items-center justify-center">
            <span className="text-white font-bold text-base">T</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg tracking-tight">
            tenir<span className="text-tenir-600">.app</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
