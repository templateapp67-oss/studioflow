import React from 'react';
import { AppView } from '../types';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  salonName: string;
  brandName?:string;
  onBuildWebsiteClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  salonName,brandName,
  onBuildWebsiteClick,
}) => {
  return (
    <header className="bg-surface/80 backdrop-blur-md fixed top-0 w-full z-50 border-b border-outline-variant/30 transition-all duration-300" id="global-nav">
      <div className="flex justify-between items-center px-margin-mobile md:px-gutter max-w-container-max mx-auto h-20">
        {/* Brand */}
        <div 
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-base cursor-pointer group"
        >
          <span className="material-symbols-outlined workspace-brand-text" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
          <span className="font-display-lg text-display-lg-mobile tracking-tighter workspace-brand-text">{brandName||'StudioFlow'}</span>
        </div>

        {/* View Switcher Navigation */}
        <nav className="hidden lg:flex items-center gap-1 bg-surface-variant/30 p-1 rounded-full border border-outline-variant/30">
          <button
            onClick={() => setCurrentView('owner')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentView === 'owner' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">space_dashboard</span>
            Owner Workspace
          </button>
          <button
            onClick={() => setCurrentView('landing')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentView === 'landing'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">home</span>
            Home
          </button>
          
          <button
            onClick={() => {
              if (onBuildWebsiteClick) {
                onBuildWebsiteClick();
              } else {
                setCurrentView('wizard');
              }
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentView === 'preview' || currentView === 'wizard'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">web</span>
            <span>Build My Salon Website</span>
            <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
              Live
            </span>
          </button>

          <button
            onClick={() => setCurrentView('dashboard')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentView === 'dashboard'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            Dashboard
          </button>
        </nav>


      </div>
      <nav className="lg:hidden flex gap-2 overflow-x-auto px-4 pb-2 text-xs" aria-label="Workspace navigation">{(['owner','landing','wizard','preview','dashboard'] as AppView[]).map(view=><button key={view} className={`whitespace-nowrap rounded-full px-3 py-2 ${currentView===view?'bg-primary text-on-primary':'bg-surface-variant'}`} onClick={()=>setCurrentView(view)}>{({owner:'Workspace',landing:'Templates',wizard:'Setup',preview:'Preview',dashboard:'Dashboard'})[view]}</button>)}</nav>
    </header>
  );
};

