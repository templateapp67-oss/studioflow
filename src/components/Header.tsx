import React from 'react';
import { AppView } from '../types';
import { 
  Sparkles, 
  LayoutDashboard, 
  Home, 
  Globe, 
  BarChart3,
  Leaf
} from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  salonName: string;
  brandName?: string;
  onBuildWebsiteClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  salonName,
  brandName,
  onBuildWebsiteClick,
}) => {
  const tabs: { id: AppView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'owner', label: 'Owner Workspace', icon: LayoutDashboard },
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'preview', label: 'Build My Salon Website', icon: Globe },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs" id="global-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <button
          type="button"
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2.5 cursor-pointer group text-left shrink-0"
        >
          <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
            <Leaf className="w-4 h-4" />
          </span>
          <span className="workspace-brand-text font-extrabold text-base sm:text-lg text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
            {brandName || 'Nexora Salon'}
          </span>
        </button>

        {/* Rounded pill-shaped nav container */}
        <nav 
          className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-full border border-slate-200/80 shadow-2xs text-xs font-semibold shrink-0 max-w-full overflow-x-auto no-scrollbar" 
          aria-label="Workspace navigation"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id || (tab.id === 'preview' && currentView === 'wizard');

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'preview') {
                    if (onBuildWebsiteClick) onBuildWebsiteClick();
                    else setCurrentView('preview');
                  } else {
                    setCurrentView(tab.id);
                  }
                }}
                className={`px-4 py-2 rounded-full transition-all inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.id === 'preview' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider ml-0.5">
                    Live
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};



