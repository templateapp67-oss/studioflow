import React from 'react';
export function PublishedWebsite({ slug }: { slug: string; session?: any }) {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-200 space-y-4">
        <h1 className="text-2xl font-black text-slate-900">Salon Website: {slug}</h1>
        <p className="text-xs text-slate-600">This salon website is published and active.</p>
        <a href="/" className="inline-block bg-violet-600 text-white font-bold text-xs px-4 py-2 rounded-xl">Back to Home</a>
      </div>
    </main>
  );
}
