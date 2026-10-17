import {useCallback,useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
import {message} from './model';
export type RewardWallet={slug:string;salon:string;points:number;earned:number;spent:number;tier:string;tierAt:number;nextTier:string|null;nextAt:number|null};
export type RewardVoucher={id:string;slug:string;salon:string;title:string;description?:string;requiredPoints:number;applicableCategory?:string;rewardType:string;discountValue:number;balance:number};
export type RewardClaim={id:string;slug:string;salon:string;title:string;points:number;code:string;status:'active'|'used';created_at:string;terms?:any};
export type RewardEntry={id:string;slug:string;salon:string;title:string;description:string;points:number;created_at:string;type:string};
export type RewardsDashboard={wallets:RewardWallet[];vouchers:RewardVoucher[];ledger:RewardEntry[];claims:RewardClaim[];signedIn:boolean};
const EMPTY:RewardsDashboard={wallets:[],vouchers:[],ledger:[],claims:[],signedIn:false};
export function useRewardsDashboard(uid:string){const[state,setState]=useState<{uid:string;data:RewardsDashboard}>({uid:'',data:EMPTY}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);const refresh=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{let active=true,ticket=0;async function load(){const id=++ticket;const {data,error}=await supabase.rpc('studioflow_customer_rewards_dashboard');if(!active||id!==ticket)return;setLoading(false);if(error){setError(message(error));return;}setError('');setState({uid,data:{...EMPTY,...data}})}setLoading(true);setError('');void load();const focus=()=>{if(!document.hidden)void load()};const timer=setInterval(focus,30000);window.addEventListener('focus',focus);const channel=uid?supabase.channel('customer-rewards-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'studioflow_customer_reward_claims',filter:`customer_id=eq.${uid}`},focus).subscribe():null;return()=>{active=false;ticket++;clearInterval(timer);window.removeEventListener('focus',focus);if(channel)void supabase.removeChannel(channel)}},[uid,revision]);
 return {data:state.uid===uid?state.data:EMPTY,loading,error,refresh};
}
