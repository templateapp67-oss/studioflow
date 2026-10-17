import React,{useRef,useState,useEffect} from 'react';
import {Clock,Coins,Users,Share2,Copy,Check,History,Gift,RefreshCw,X,Ticket,ShieldCheck} from 'lucide-react';
import {ReferralMembers} from './ReferralMembers';
import {Empty,Notice} from './Parts';
import {useRewardsDashboard,type RewardVoucher} from './useRewardsDashboard';
import {customerReferralLink} from '../../lib/customerReferral';
import {supabase} from '../../lib/supabase';
import {message} from './model';
import {useCustomerDialog} from './BookingFlow';
export function CustomerRewards({referral,signedIn,error,signIn,share,uid='',onChanged=()=>{}}:{points:number;rewards:any[];referral:string;signedIn:boolean;error:string;signIn:()=>void;share:()=>void;uid?:string;onChanged?:()=>void}){
 const {data,loading,error:loadError,refresh}=useRewardsDashboard(uid);const [selected,setSelected]=useState(''),[copied,setCopied]=useState(''),[notice,setNotice]=useState(''),[target,setTarget]=useState<RewardVoucher|null>(null),[busy,setBusy]=useState(false);const request=useRef('');const actor=useRef(uid);actor.current=uid;useEffect(()=>{setTarget(null);setNotice('');setCopied('');setSelected('');setBusy(false)},[uid]);
 const wallet=data.wallets.find(w=>w.slug===selected)||data.wallets[0];const current=wallet?.slug||'';const vouchers=data.vouchers.filter(v=>!current||v.slug===current),ledger=signedIn?data.ledger.filter(e=>!current||e.slug===current):[],claims=data.claims.filter(c=>!current||c.slug===current);
 const progress=wallet?.nextAt?Math.max(0,Math.min(100,(wallet.earned-wallet.tierAt)/(wallet.nextAt-wallet.tierAt)*100)):100;
 useEffect(()=>{if(!notice||target)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer)},[notice,target]);
 const [summary,setSummary]=useState<{uid:string;joined:number;qualified:number;points:number;attribution?:string}|null>(null);useEffect(()=>{let active=true;setSummary(null);if(uid)void supabase.rpc('studioflow_customer_referral_summary').then(({data,error})=>{if(active&&!error&&data)setSummary({uid,...data})});return()=>{active=false}},[uid,data]);
 const invite=customerReferralLink(referral);const inviteText=`Discover salons and book with Nexora. ${invite}${referral?' · My referral code: '+referral:''}`;
 async function copy(value:string,key:string){try{await navigator.clipboard.writeText(value);setCopied(key);setNotice('Copied to clipboard.')}catch{setNotice(value)}}
 function choose(v:RewardVoucher){if(!signedIn){signIn();return;}request.current=crypto.randomUUID();setNotice('');setTarget(v)}
 async function redeem(){if(!target||busy)return;const customer=uid;setBusy(true);setNotice('');try{const {data,error}=await supabase.rpc('studioflow_customer_redeem_reward',{p_slug:target.slug,p_reward:target.id,p_request:request.current});if(actor.current!==customer)return;if(error)throw error;if(!data?.code)throw new Error('Voucher could not be issued. Retry this request.');setNotice('Voucher issued: '+data.code+'. Show it at '+target.salon+' under the reward terms.');setTarget(null);refresh();onChanged()}catch(e){if(actor.current===customer)setNotice(message(e))}finally{if(actor.current===customer)setBusy(false)}}
 return (
    <div className="cr-reference-screen cr-reference-rewards max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="cr-reference-reward-tools"><label>Salon <select aria-label="Choose rewards salon" value={current} onChange={e=>setSelected(e.target.value)} disabled={!data.wallets.length}>{!data.wallets.length&&<option value="">No active programs</option>}{data.wallets.map(w=><option value={w.slug} key={w.slug}>{w.salon}</option>)}</select></label><button aria-label="Refresh rewards" onClick={refresh}><RefreshCw size={14}/></button></div>
      {(loadError||error)&&<Notice>{loadError||error}<button onClick={refresh}>Retry</button></Notice>}
      {signedIn&&summary?.uid===uid&&<p className="text-sm text-slate-600" aria-label="Referral progress">Friends joined: {summary.joined} · Qualified: {summary.qualified} · Referral points: {summary.points}{summary.attribution&&' · Your invitation: '+summary.attribution}</p>}
      {/* Top Banner / Coin Card */}
      <div className="relative rounded-3xl bg-white border border-amber-200 p-5 sm:p-6 overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {signedIn?wallet?.tier||'Member':'Loyalty'} {signedIn?'Tier Member':'Rewards'}
              </span>
              <span className="text-xs text-slate-500 font-medium">{wallet?.salon||'Your salon program'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 flex items-center gap-2 mt-1">
              <span>{signedIn&&!loading?wallet?.points||0:'—'}</span>
              <Coins className="w-8 h-8 text-amber-500 inline" />
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {signedIn?'Available coins for salon rewards & upgrades':'Sign in to see your points and membership tier'}
            </p>
          </div>

          <div className="sm:max-w-xs w-full space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700">Tier: {signedIn?wallet?.tier||'Member':'Sign in'}</span>
              <span className="text-amber-700">{signedIn&&wallet?(wallet.nextAt?`${wallet.earned}/${wallet.nextAt} to ${wallet.nextTier}`:'Highest published tier'):'Your salon membership'}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                role="progressbar" aria-label="Loyalty tier progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={signedIn?Math.round(progress):0} style={{ width: `${signedIn?progress:0}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Tier benefits follow your salon’s current loyalty program. Earn points through eligible completed visits.
            </p>
          </div>
        </div>
      </div>

      {/* Referral Program Section */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-200">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Invite Friends
              </h2>
              <p className="text-xs text-slate-500">
                Earn 200 points when a friend’s first real booking is paid and completed at a participating salon. Points belong to that salon; demo visits do not qualify.
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              {signedIn?'Your referral code':'Join Nexora'}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono mt-1">{signedIn?'Account linked':'Customer rewards'}</span>
          </div>
        </div>

        {/* Referral Code Bar */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-xl font-mono text-sm font-black text-violet-800 tracking-wider">
              {signedIn?referral||'Loading…':'SIGN IN'}
            </div>
            <button
              disabled={!signedIn||!referral} onClick={()=>void copy(referral,'referral')}
              className="text-xs text-slate-700 hover:text-violet-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              {(copied==='referral') ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{(copied==='referral') ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              disabled={!signedIn||!referral} onClick={()=>void copy(invite,'invite')}
              className="flex-1 sm:flex-none px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              {(copied==='invite') ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
              <span>{(copied==='invite') ? 'Link Copied' : 'Copy Invite Link'}</span>
            </button>
            <button
              onClick={()=>{if(!signedIn){signIn();return;}window.open('https://wa.me/?text='+encodeURIComponent(inviteText),'_blank','noopener,noreferrer')}}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </section>

      {signedIn&&<ReferralMembers uid={uid} revision={data}/>}

      {/* Eligible Rewards / Vouchers Store */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Redeem Eligible Rewards
            </h2>
          </div>
          <span className="text-xs text-slate-500">Use at the selected salon</span>
        </div>

        {loading&&<p role="status" className="text-xs text-slate-500">Loading salon rewards…</p>}{!loading&&!vouchers.length&&<Empty>No active rewards are published for this salon yet.</Empty>}<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vouchers.map((v) => {
            const issued=signedIn?data.claims.find(c=>c.slug===v.slug&&c.title===v.title&&c.status==='active'):undefined;const isRedeemed=!!issued;
            const canAfford = signedIn&&v.balance >= v.requiredPoints;
            return (
              <div
                key={v.slug+v.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                      {v.applicableCategory||'Salon'} Voucher
                    </span>
                    <span className="text-xs font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                      {v.requiredPoints} Coins
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{v.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {v.description||'Terms are provided by the salon.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    Code: <strong className="text-slate-900 font-bold">{issued?.code||'After redemption'}</strong>
                  </span>
                  <button
                    onClick={() => choose(v)}
                    disabled={busy||!!loadError||isRedeemed||(signedIn&&!canAfford)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isRedeemed
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : (canAfford||!signedIn)
                        ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {isRedeemed?'Redeemed ✓':!signedIn?'Sign in to Redeem':canAfford?'Redeem Voucher':'Need More Coins'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Loyalty Ledger / Points History */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Points History & Ledger
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">StudioFlow Points Ledger</span>
        </div>

        {!loading&&!ledger.length&&<Empty action={!signedIn?'Sign in':undefined} onAction={signIn}>{signedIn?'Your completed visits and redeemed vouchers will appear here.':'Sign in to view your private points history.'}</Empty>}<div className="space-y-2">
          {ledger.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
            >
              <div>
                <p className="font-bold text-slate-900">{entry.title}</p>
                <p className="text-[11px] text-slate-500">{entry.salon}{entry.description?' · '+entry.description:''}</p>
                <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(entry.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})}</span>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`text-sm font-black font-mono ${
                    entry.points < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {entry.points < 0 ? '-' : '+'}
                  {Math.abs(entry.points)}
                </span>
                <span className="text-[10px] text-slate-500 block font-medium">Coins</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      {notice&&<div className="cr-reference-toast" role="status"><Check size={15}/>{notice}<button aria-label="Dismiss reward message" onClick={()=>setNotice('')}><X size={14}/></button></div>}
      {target&&<RedeemConfirmation voucher={target} busy={busy} notice={notice} close={()=>{if(!busy)setTarget(null)}} confirm={()=>void redeem()}/>}
    </div>
 );
}
function RedeemConfirmation({voucher,busy,notice,close,confirm}:{voucher:RewardVoucher;busy:boolean;notice:string;close:()=>void;confirm:()=>void}){const ref=useCustomerDialog(close);return <div className="cr-overlay"><section className="cr-reward-confirm" ref={ref as React.RefObject<HTMLDivElement>} role="dialog" aria-modal="true" aria-label="Redeem salon voucher"><header><h2><ShieldCheck size={18}/>Redeem Voucher</h2><button className="cr-icon" disabled={busy} aria-label="Close reward redemption" onClick={close}><X size={18}/></button></header><h3>{voucher.title}</h3><p>{voucher.salon}</p><p>{voucher.description}</p><div className="cr-reward-confirm-cost"><span>Points to redeem</span><b>{voucher.requiredPoints} Coins</b></div><p>This deducts points from this salon’s balance and issues a voucher. Present it at the salon under its terms. Your online booking advance is calculated separately.</p>{notice&&<Notice>{notice}</Notice>}<footer><button className="cr-outline" disabled={busy} onClick={close}>Keep Points</button><button className="cr-primary" disabled={busy} onClick={confirm}>{busy?'Issuing…':`Redeem ${voucher.requiredPoints} Coins`}</button></footer></section></div>}
