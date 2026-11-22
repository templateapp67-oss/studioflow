import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SalonProfile } from '../types';
import { BranchLocationsEditor } from './BranchLocationsEditor';
import { STAFF_ACCESS_ROLES, ROLE_SHORT_LABELS, ROLE_PERMISSIONS, PERMISSION_LABELS, normalizeAccessRole, can, DEFAULT_ACCESS_ROLE } from '../lib/staffPermissions';
import type { StaffAccessRole } from '../types';

type InventoryItem = { id: string; branch_id: string; name: string; sku: string; quantity: number; unit: string; reorder_level: number; is_active: boolean };
type BranchMember = { id: string; owner_id: string; user_id: string; staff_id: string; branch_ids: string[]; all_branches: boolean; role: string; is_active: boolean };
interface Props { profile: SalonProfile; setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>; }

export const BranchManagementPanel: React.FC<Props> = ({ profile, setProfile }) => {
  const branches = (profile.branches || []).filter(branch => branch.isActive);
  const [branchId, setBranchId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [members, setMembers] = useState<BranchMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState(''); const [sku, setSku] = useState(''); const [quantity, setQuantity] = useState('0'); const [unit, setUnit] = useState('unit'); const [reorder, setReorder] = useState('0');
  const [staffUserId, setStaffUserId] = useState(''); const [memberRole, setMemberRole] = useState<StaffAccessRole>(DEFAULT_ACCESS_ROLE);
  useEffect(() => { if (!branches.some(branch => branch.id === branchId)) setBranchId(branches[0]?.id || ''); }, [branches, branchId]);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setOwnerId(data.user?.id || '')); }, []);

  const reload = useCallback(async () => {
    if (!ownerId || !branchId) { setItems([]); setMembers([]); return; }
    setLoading(true); setError('');
    const [inventoryResult, membersResult] = await Promise.all([
      supabase.from('studioflow_branch_inventory').select('id,branch_id,name,sku,quantity,unit,reorder_level,is_active').eq('site_id', ownerId).eq('branch_id', branchId).eq('is_active', true).order('name'),
      supabase.from('studioflow_staff_members').select('id,owner_id,user_id,staff_id,branch_ids,all_branches,role,is_active').eq('owner_id', ownerId).eq('is_active', true).order('created_at'),
    ]);
    if (inventoryResult.error || membersResult.error) setError(inventoryResult.error?.message || membersResult.error?.message || 'Branch data could not be loaded.');
    setItems((inventoryResult.data || []) as InventoryItem[]);
    setMembers(((membersResult.data || []) as BranchMember[]).filter(member => member.all_branches || (member.branch_ids || []).includes(branchId)));
    setLoading(false);
  }, [ownerId, branchId]);
  useEffect(() => { void reload(); }, [reload]);

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    const qty = Number(quantity); const threshold = Number(reorder);
    if (!ownerId || !branchId || !name.trim() || !Number.isFinite(qty) || qty < 0 || !Number.isFinite(threshold) || threshold < 0) { setError('Enter a product name and valid non-negative stock amounts.'); return; }
    const result = await supabase.from('studioflow_branch_inventory').insert({ site_id: ownerId, branch_id: branchId, name: name.trim(), sku: sku.trim(), quantity: qty, unit: unit.trim() || 'unit', reorder_level: threshold });
    if (result.error) { setError(result.error.message); return; }
    setName(''); setSku(''); setQuantity('0'); setReorder('0'); setNotice('Inventory item added.'); await reload();
  };
  const updateQuantity = async (item: InventoryItem, next: string) => {
    const amount = Number(next); if (!Number.isFinite(amount) || amount < 0) return;
    const result = await supabase.from('studioflow_branch_inventory').update({ quantity: amount }).eq('id', item.id).eq('site_id', ownerId).eq('branch_id', branchId);
    if (result.error) setError(result.error.message); else await reload();
  };
  const deactivateItem = async (item: InventoryItem) => {
    const result = await supabase.from('studioflow_branch_inventory').update({ is_active: false }).eq('id', item.id).eq('site_id', ownerId).eq('branch_id', branchId);
    if (result.error) setError(result.error.message); else await reload();
  };
  const addMember = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!ownerId || !branchId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(staffUserId.trim())) {
      setError('Enter the staff member’s authenticated user ID (UUID).'); return;
    }
    const { data, error: lookupError } = await supabase.from('studioflow_staff_members')
      .select('id,branch_ids,all_branches,role,is_active')
      .eq('owner_id', ownerId).eq('user_id', staffUserId.trim()).eq('is_active', true).limit(2);
    if (lookupError) { setError(lookupError.message); return; }
    if (!data?.length) { setError('This person has not accepted a staff invite for this salon yet. Create and accept the invite first.'); return; }
    if (data.length !== 1) { setError('This login has more than one staff profile in this salon. Ask the owner to resolve the duplicate before assigning a branch.'); return; }

    const membership = data[0] as any;
    const branchIds = Array.isArray(membership.branch_ids) ? membership.branch_ids.map(String) : [];
    const nextBranchIds = membership.all_branches ? branchIds : Array.from(new Set([...branchIds, branchId]));
    const result = await supabase.from('studioflow_staff_members')
      .update({ role: memberRole, branch_ids: nextBranchIds })
      .eq('id', membership.id).eq('owner_id', ownerId);
    if (result.error) { setError(result.error.message); return; }
    setStaffUserId('');
    setNotice(membership.all_branches ? 'Staff role updated. This login already has access to all branches.' : 'Staff role and branch access saved.');
    await reload();
  };

  const removeMember = async (member: BranchMember) => {
    if (member.all_branches) {
      setError('This login has all-branches access. Change its all-branches setting in Team → Staff access.');
      return;
    }
    const nextBranchIds = (member.branch_ids || []).filter(id => id !== branchId);
    const result = await supabase.from('studioflow_staff_members')
      .update({ branch_ids: nextBranchIds })
      .eq('id', member.id).eq('owner_id', ownerId);
    if (result.error) setError(result.error.message); else await reload();
  };

  return <div className="space-y-6">
    <header><h2 className="text-2xl font-bold">Branches, schedules & inventory</h2><p className="mt-1 text-sm text-gray-600">Manage public locations and branch-level stock. Owners manage access; staff only see branches assigned to their account.</p></header>
    <BranchLocationsEditor profile={profile} setProfile={setProfile} />
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Inventory & staff access</h3><p className="text-sm text-gray-600">Inventory and memberships are protected by tenant- and branch-scoped database policies.</p></div>
        <label className="text-sm font-semibold">Selected branch<select value={branchId} onChange={event => setBranchId(event.target.value)} className="ml-2 rounded-lg border border-gray-300 p-2">{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      </div>
      {!branches.length ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Add and save an active location before managing its data.</p> : <>
        <form onSubmit={saveItem} className="mt-5 grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-bold">Product<input required value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded border p-2 text-sm" /></label>
          <label className="text-xs font-bold">SKU (optional)<input value={sku} onChange={event => setSku(event.target.value)} className="mt-1 w-full rounded border p-2 text-sm" /></label>
          <label className="text-xs font-bold">Stock<input type="number" min="0" step="0.01" value={quantity} onChange={event => setQuantity(event.target.value)} className="mt-1 w-full rounded border p-2 text-sm" /></label>
          <label className="text-xs font-bold">Unit<input value={unit} onChange={event => setUnit(event.target.value)} className="mt-1 w-full rounded border p-2 text-sm" /></label>
          <label className="text-xs font-bold">Reorder at<input type="number" min="0" step="0.01" value={reorder} onChange={event => setReorder(event.target.value)} className="mt-1 w-full rounded border p-2 text-sm" /></label>
          <button className="self-end rounded-lg bg-[#b0004a] px-4 py-2 font-bold text-white">Add stock</button>
        </form>
        {loading && <p className="mt-3 text-sm text-gray-500">Loading branch data…</p>}
        {items.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-gray-500"><th className="p-2">Product</th><th className="p-2">SKU</th><th className="p-2">Quantity</th><th className="p-2">Reorder level</th><th className="p-2">Action</th></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-b"><td className="p-2 font-medium">{item.name}<span className="ml-1 text-gray-500">({item.unit})</span></td><td className="p-2">{item.sku || '—'}</td><td className="p-2"><input aria-label={`${item.name} quantity`} type="number" min="0" step="0.01" defaultValue={item.quantity} onBlur={event => updateQuantity(item,event.target.value)} className="w-24 rounded border p-1" />{item.quantity <= item.reorder_level && <span className="ml-2 text-xs font-bold text-amber-700">Low stock</span>}</td><td className="p-2">{item.reorder_level}</td><td className="p-2"><button type="button" onClick={() => void deactivateItem(item)} className="font-semibold text-red-700">Archive</button></td></tr>)}</tbody></table></div>}
        <form onSubmit={addMember} className="mt-6 rounded-xl border border-dashed border-gray-300 p-4">
          <h4 className="font-bold">Assign staff to this branch</h4><p className="mb-3 text-xs text-gray-600">Use the staff member’s authenticated Supabase user ID; never use an owner/service key in the browser.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs font-bold sm:col-span-2">Staff user ID<input value={staffUserId} onChange={event => setStaffUserId(event.target.value)} placeholder="UUID" className="mt-1 w-full rounded border p-2 text-sm" /></label><label className="text-xs font-bold">App access role<select value={memberRole} onChange={event => setMemberRole(normalizeAccessRole(event.target.value))} className="mt-1 w-full rounded border p-2 text-sm">{STAFF_ACCESS_ROLES.map(accessRole => <option key={accessRole} value={accessRole}>{accessRole}</option>)}</select></label></div>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2" aria-label={`Permissions for ${memberRole}`}>{ROLE_PERMISSIONS[memberRole].map(permission => <li key={permission} className="text-xs text-gray-600">✓ {PERMISSION_LABELS[permission]}</li>)}</ul>
          <p className="mt-2 text-xs text-gray-600">This updates an existing accepted staff login in the salon’s current membership record. Inventory changes require the Manager role.</p>
          <button className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold">Save branch access</button>
        </form>
        {members.length>0 && <ul className="mt-3 space-y-2">{members.map(member => <li key={member.id} className="flex flex-wrap items-center justify-between rounded-lg bg-gray-50 p-3 text-sm"><span>{member.staff_id} · {ROLE_SHORT_LABELS[normalizeAccessRole(member.role)]}{member.all_branches ? ' · all branches' : ''}</span>{member.all_branches ? <span className="text-xs text-gray-500">Manage in Team</span> : <button type="button" onClick={() => void removeMember(member)} className="text-red-700">Remove this branch</button>}</li>)}</ul>}
      </>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mt-3 text-sm text-green-700">{notice}</p>}
    </section>
  </div>;
};
