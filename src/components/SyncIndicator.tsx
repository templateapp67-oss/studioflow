import React from 'react';

type SyncIndicatorProps = {
  sync: string;
  syncError: string;
};

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ sync, syncError }) => {
  const isSyncing = sync === 'Saving…';
  
  if (!isSyncing && !syncError) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[999] flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition-opacity duration-300 ${syncError ? 'bg-red-100 text-red-800' : 'bg-violet-100 text-violet-800'}`}>
      {isSyncing && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
        </span>
      )}
      <span>{syncError || sync}</span>
    </div>
  );
};
