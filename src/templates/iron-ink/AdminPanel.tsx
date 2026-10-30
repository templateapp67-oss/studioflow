import React from 'react';

export function IronInkAdminPanel(props: any) {
  return (
    <div className="p-6 bg-[#0A0A0B] text-white rounded-2xl border border-rose-500/20 space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-rose-500">Iron & Ink Studio Management</h2>
          <p className="text-xs text-neutral-400">Manage custom tattoo bookings, body piercing consults & artist portfolios</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#141417] rounded-xl border border-white/10">
          <span className="text-xs text-neutral-400">Active Tattoo Enquiries</span>
          <p className="text-2xl font-black text-rose-400 mt-1">12</p>
        </div>
        <div className="p-4 bg-[#141417] rounded-xl border border-white/10">
          <span className="text-xs text-neutral-400">Piercing Consults Today</span>
          <p className="text-2xl font-black text-white mt-1">5</p>
        </div>
        <div className="p-4 bg-[#141417] rounded-xl border border-white/10">
          <span className="text-xs text-neutral-400">Studio Artists</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">4</p>
        </div>
      </div>
    </div>
  );
}
