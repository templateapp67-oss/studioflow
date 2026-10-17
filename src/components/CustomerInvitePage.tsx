import type {Session} from '@supabase/supabase-js';
import {AuthPage} from './AuthPage';
/** Invitation URLs always show signup, including when the sender is already signed in. */
export function CustomerInvitePage({session}:{session:Session|null}){
 return <div className="min-h-screen bg-pink-50 px-4 py-8 sm:py-12"><header className="mx-auto max-w-lg mb-5 flex items-center justify-between"><a href="/?app=1" className="font-bold text-pink-700 text-xl">Nexora</a><a href="/?app=1" className="text-sm underline text-slate-600">Back to app</a></header><div className="mx-auto max-w-lg">{session&&<p className="mb-4 rounded-xl border border-pink-200 bg-white p-3 text-sm text-slate-600">You are already signed in. Creating a new account will sign you out on this device.</p>}<AuthPage compact customerMode initialMode="signup" invitationMode/></div></div>
}
