import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Check,
  Edit3,
  Gift,
  Inbox,
  Plus,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import type { SalonProfile, SalonService } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  ZIYA_OFFER_BANNER_PRESETS,
  formatOfferDiscountBadge,
  formatValidityRange,
  type ZiyaAdminDashboardData,
  type ZiyaLoyaltyReward,
  type ZiyaLoyaltySettings,
  type ZiyaPromotion,
} from '../../lib/ziyaPromotionsLoyalty';

interface ZiyaAdminPanelProps {
  profile: SalonProfile;
  services: SalonService[];
  initialSubTab?: 'promotions' | 'loyalty' | 'enquiries';
}

const EMPTY_PROMO_DRAFT: ZiyaPromotion = {
  id: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: 15,
  couponCode: '',
  minBookingAmount: 500,
  applicableServiceIds: [],
  startsAt: '',
  endsAt: '',
  maxTotalUses: 200,
  maxUsesPerCustomer: 1,
  termsConditions: 'Valid on eligible women’s haircut appointments at Ziya Women’s Hair Studio.',
  bannerImageUrl: ZIYA_OFFER_BANNER_PRESETS[0].url,
  displayOrder: 1,
  isActive: true,
  isDemo: false,
  demoApproved: true,
};

const EMPTY_REWARD_DRAFT: ZiyaLoyaltyReward = {
  id: '',
  title: '',
  description: '',
  pointsCost: 100,
  rewardType: 'flat_discount',
  discountValue: 50,
  minBookingAmount: 350,
  applicableServiceIds: [],
  validityDays: 90,
  displayOrder: 1,
  isActive: true,
  isDemo: false,
};

export const ZiyaAdminPanel: React.FC<ZiyaAdminPanelProps> = ({
  profile,
  services,
  initialSubTab = 'promotions',
}) => {
  const [subTab, setSubTab] = useState<'promotions' | 'loyalty' | 'enquiries'>(initialSubTab);
  const [data, setData] = useState<ZiyaAdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  // Promotion Editor State
  const [editingPromo, setEditingPromo] = useState<ZiyaPromotion | null>(null);

  // Loyalty Settings Draft State
  const [settingsDraft, setSettingsDraft] = useState<ZiyaLoyaltySettings>({
    programName: 'Ziya Style Rewards',
    isEnabled: true,
    pointsPer100Inr: 1,
    pointsPerVisit: 0,
    minEligibleSpendInr: 100,
    welcomeBonusPoints: 0,
    rulesSummary:
      'Earn 1 Ziya Style Point for every ₹100 spent on eligible completed women’s haircut appointments.',
    termsConditions:
      'Points credit automatically on Completed haircut visits and reverse on cancellations or refunds.',
    isDemo: true,
    demoApproved: false,
  });

  // Loyalty Reward Editor State
  const [editingReward, setEditingReward] = useState<ZiyaLoyaltyReward | null>(null);

  // Manual Point Adjustment State
  const [adjustCustomerId, setAdjustCustomerId] = useState('');
  const [adjustPointsDelta, setAdjustPointsDelta] = useState('50');
  const [adjustReason, setAdjustReason] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.rpc('studioflow_ziya_admin_dashboard', {});
      if (error) throw error;
      const parsed = res as ZiyaAdminDashboardData;
      setData(parsed);
      if (parsed?.loyaltySettings) {
        setSettingsDraft({
          programName: parsed.loyaltySettings.programName || 'Ziya Style Rewards',
          isEnabled: parsed.loyaltySettings.isEnabled !== false,
          pointsPer100Inr: Number(parsed.loyaltySettings.pointsPer100Inr ?? 1),
          pointsPerVisit: Number(parsed.loyaltySettings.pointsPerVisit ?? 0),
          minEligibleSpendInr: Number(parsed.loyaltySettings.minEligibleSpendInr ?? 100),
          welcomeBonusPoints: Number(parsed.loyaltySettings.welcomeBonusPoints ?? 0),
          rulesSummary: parsed.loyaltySettings.rulesSummary || '',
          termsConditions: parsed.loyaltySettings.termsConditions || '',
          isDemo: !!parsed.loyaltySettings.isDemo,
          demoApproved: !!parsed.loyaltySettings.demoApproved,
        });
      }
    } catch (err) {
      setNotice({
        tone: 'err',
        text:
          err instanceof Error
            ? err.message
            : 'Unable to load Ziya Promotions & Style Rewards data from Supabase.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleSavePromotion = async (promoToSave: ZiyaPromotion) => {
    setBusy(true);
    setNotice(null);
    try {
      const payload = {
        id: promoToSave.id || null,
        title: promoToSave.title.trim(),
        description: promoToSave.description.trim(),
        discountType: promoToSave.discountType,
        discountValue: Number(promoToSave.discountValue),
        couponCode: promoToSave.couponCode.trim().toUpperCase(),
        minBookingAmount: Number(promoToSave.minBookingAmount || 0),
        applicableServiceIds: promoToSave.applicableServiceIds,
        startsAt: promoToSave.startsAt || null,
        endsAt: promoToSave.endsAt || null,
        maxTotalUses:
          promoToSave.maxTotalUses && Number(promoToSave.maxTotalUses) > 0
            ? Number(promoToSave.maxTotalUses)
            : null,
        maxUsesPerCustomer: Number(promoToSave.maxUsesPerCustomer || 1),
        termsConditions: promoToSave.termsConditions.trim(),
        bannerImageUrl: promoToSave.bannerImageUrl.trim(),
        displayOrder: Number(promoToSave.displayOrder || 1),
        isActive: promoToSave.isActive !== false,
        demoApproved: promoToSave.demoApproved ?? !promoToSave.isDemo,
      };
      const { error } = await supabase.rpc('studioflow_ziya_admin_save_promotion', {
        p_promo: payload,
        p_salon_id: data?.salonId || null,
      });
      if (error) throw error;
      setNotice({
        tone: 'ok',
        text: `Saved haircut promotion "${payload.title}" (${payload.couponCode}).`,
      });
      setEditingPromo(null);
      await loadDashboard();
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Failed to save promotion.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePromotion = async (promo: ZiyaPromotion) => {
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.rpc('studioflow_ziya_admin_delete_promotion', {
        p_id: promo.id,
      });
      if (error) throw error;
      setNotice({ tone: 'ok', text: `Deleted promotion "${promo.title}".` });
      await loadDashboard();
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not delete promotion.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLoyaltySettings = async (approveDemo = false) => {
    setBusy(true);
    setNotice(null);
    try {
      const payload = {
        ...settingsDraft,
        demoApproved: approveDemo ? true : settingsDraft.demoApproved,
      };
      const { error } = await supabase.rpc('studioflow_ziya_admin_save_loyalty_settings', {
        p_settings: payload,
        p_salon_id: data?.salonId || null,
      });
      if (error) throw error;
      setNotice({
        tone: 'ok',
        text: approveDemo
          ? 'Approved Ziya Style Rewards as your official live salon program.'
          : 'Saved Ziya Style Rewards settings.',
      });
      await loadDashboard();
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not save loyalty settings.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveReward = async (rewardToSave: ZiyaLoyaltyReward) => {
    setBusy(true);
    setNotice(null);
    try {
      const payload = {
        id: rewardToSave.id || null,
        title: rewardToSave.title.trim(),
        description: rewardToSave.description.trim(),
        pointsCost: Number(rewardToSave.pointsCost),
        rewardType: rewardToSave.rewardType,
        discountValue: Number(rewardToSave.discountValue),
        minBookingAmount: Number(rewardToSave.minBookingAmount || 0),
        applicableServiceIds: rewardToSave.applicableServiceIds,
        validityDays: Number(rewardToSave.validityDays || 90),
        displayOrder: Number(rewardToSave.displayOrder || 1),
        isActive: rewardToSave.isActive !== false,
        demoApproved: true,
      };
      const { error } = await supabase.rpc('studioflow_ziya_admin_save_loyalty_reward', {
        p_reward: payload,
        p_salon_id: data?.salonId || null,
      });
      if (error) throw error;
      setNotice({ tone: 'ok', text: `Saved reward tier "${payload.title}".` });
      setEditingReward(null);
      await loadDashboard();
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not save loyalty reward.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteReward = async (reward: ZiyaLoyaltyReward) => {
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.rpc('studioflow_ziya_admin_delete_loyalty_reward', {
        p_id: reward.id,
      });
      if (error) throw error;
      setNotice({ tone: 'ok', text: `Deleted reward tier "${reward.title}".` });
      await loadDashboard();
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not delete reward tier.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleManualAdjust = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    const delta = Number(adjustPointsDelta);
    if (!adjustCustomerId.trim()) {
      setNotice({ tone: 'err', text: 'Select or paste a valid customer user ID.' });
      return;
    }
    if (!Number.isInteger(delta) || delta === 0) {
      setNotice({ tone: 'err', text: 'Enter a non-zero whole number of points (e.g. 50 or -25).' });
      return;
    }
    if (adjustReason.trim().length < 3) {
      setNotice({ tone: 'err', text: 'Enter an audit reason (at least 3 characters).' });
      return;
    }

    setBusy(true);
    try {
      const requestId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : undefined;
      const { data: res, error } = await supabase.rpc('studioflow_ziya_admin_adjust_points', {
        p_customer_id: adjustCustomerId.trim(),
        p_points_delta: delta,
        p_reason: adjustReason.trim(),
        p_salon_id: data?.salonId || null,
        p_request_id: requestId,
      });
      if (error) throw error;
      setNotice({
        tone: 'ok',
        text: `Adjusted customer points by ${delta > 0 ? `+${delta}` : delta}. New balance: ${(res as any)?.balanceAfter ?? 0} pts.`,
      });
      setAdjustReason('');
      await loadDashboard();
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Manual point adjustment failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEnquiryStatus = async (id: string, status: 'new' | 'read' | 'replied' | 'closed') => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('studioflow_enquiries')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      await loadDashboard();
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not update enquiry status.',
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleApplicableService = (serviceId: string) => {
    if (!editingPromo) return;
    const exists = editingPromo.applicableServiceIds.includes(serviceId);
    const next = exists
      ? editingPromo.applicableServiceIds.filter((id) => id !== serviceId)
      : [...editingPromo.applicableServiceIds, serviceId];
    setEditingPromo({ ...editingPromo, applicableServiceIds: next });
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#e7d7cc] bg-[#fdf8f4] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#8f6856]">
            <Scissors size={13} /> {profile.businessName || 'Ziya Women’s Hair Studio'}
          </span>
          <h2 className="text-2xl font-bold text-[#261c18] mt-1">
            Promotions, Ziya Style Rewards &amp; Haircut Enquiries
          </h2>
          <p className="text-sm text-[#6b5750] mt-1">
            Manage verified Supabase haircut coupon codes, automatic loyalty points, and customer haircut consultation requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading || busy}
          className="inline-flex items-center gap-2 rounded-xl border border-[#dcc8ba] bg-white px-4 py-2 text-xs font-semibold text-[#261c18] hover:bg-[#f7efe9]"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Studio Data
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'promotions'}
          onClick={() => setSubTab('promotions')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            subTab === 'promotions'
              ? 'bg-[#261c18] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Tag size={15} />
          Promotions &amp; Coupons ({data?.promotions?.length ?? 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'loyalty'}
          onClick={() => setSubTab('loyalty')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            subTab === 'loyalty'
              ? 'bg-[#261c18] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Gift size={15} />
          Ziya Style Rewards ({data?.loyaltyRewards?.length ?? 0} tiers)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'enquiries'}
          onClick={() => setSubTab('enquiries')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            subTab === 'enquiries'
              ? 'bg-[#261c18] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Inbox size={15} />
          Haircut Enquiries ({data?.enquiries?.length ?? 0})
        </button>
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.tone === 'err'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* TAB 1: PROMOTIONS MANAGEMENT */}
      {subTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Women’s Haircut Promotions</h3>
              <p className="text-xs text-slate-600">
                Seeded demo offers carry a clear “Sample Offer” label until you edit or approve them for live studio use.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingPromo({
                  ...EMPTY_PROMO_DRAFT,
                  displayOrder: (data?.promotions?.length || 0) + 1,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#261c18] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#3b2c26]"
            >
              <Plus size={15} /> Create Haircut Offer
            </button>
          </div>

          {/* Promotion Create/Edit Form + Live Customer Card Preview */}
          {editingPromo && (
            <div className="rounded-2xl border border-[#dcc8ba] bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-bold text-base">
                  {editingPromo.id ? `Edit Offer: ${editingPromo.title}` : 'Create New Haircut Offer'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingPromo(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Close Editor
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 text-xs">
                  <label className="block sm:col-span-2">
                    <span className="font-semibold text-slate-700">Offer Title *</span>
                    <input
                      type="text"
                      value={editingPromo.title}
                      onChange={(e) => setEditingPromo({ ...editingPromo, title: e.target.value })}
                      placeholder="e.g. First Haircut Welcome Offer"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="font-semibold text-slate-700">Offer Description</span>
                    <textarea
                      rows={2}
                      value={editingPromo.description}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, description: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">Discount Type *</span>
                    <select
                      value={editingPromo.discountType}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          discountType: e.target.value as 'percentage' | 'flat',
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="percentage">Percentage Discount (%)</option>
                      <option value="flat">Flat Discount (₹)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">
                      Discount Value ({editingPromo.discountType === 'percentage' ? '%' : '₹'}) *
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={editingPromo.discountValue}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          discountValue: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">Coupon Code *</span>
                    <input
                      type="text"
                      value={editingPromo.couponCode}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          couponCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                        })
                      }
                      placeholder="e.g. ZIYA15"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">Minimum Booking Amount (₹)</span>
                    <input
                      type="number"
                      min={0}
                      value={editingPromo.minBookingAmount}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          minBookingAmount: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">Start Date (Optional)</span>
                    <input
                      type="date"
                      value={editingPromo.startsAt || ''}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, startsAt: e.target.value || null })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">End Date (Optional)</span>
                    <input
                      type="date"
                      value={editingPromo.endsAt || ''}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, endsAt: e.target.value || null })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">Max Total Redemptions</span>
                    <input
                      type="number"
                      min={1}
                      value={editingPromo.maxTotalUses ?? ''}
                      placeholder="Unlimited"
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          maxTotalUses: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">Per-Customer Usage Limit</span>
                    <input
                      type="number"
                      min={1}
                      value={editingPromo.maxUsesPerCustomer}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          maxUsesPerCustomer: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-700">Display Order</span>
                    <input
                      type="number"
                      min={1}
                      value={editingPromo.displayOrder}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          displayOrder: Number(e.target.value || 1),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="flex items-center gap-4 pt-5">
                    <label className="inline-flex items-center gap-2 font-semibold">
                      <input
                        type="checkbox"
                        checked={editingPromo.isActive !== false}
                        onChange={(e) =>
                          setEditingPromo({ ...editingPromo, isActive: e.target.checked })
                        }
                      />
                      Active on Website
                    </label>
                  </div>

                  {/* Applicable Haircut Services Selector */}
                  <div className="sm:col-span-2 border rounded-xl p-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-700">
                        Applicable Women’s Haircut Services (leave all unchecked for All Haircuts)
                      </span>
                      {editingPromo.applicableServiceIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPromo({ ...editingPromo, applicableServiceIds: [] })
                          }
                          className="text-xs underline text-slate-600"
                        >
                          Reset to All Services
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => toggleApplicableService('__packages__')}
                        className={`px-2.5 py-1 rounded-lg border text-xs ${
                          editingPromo.applicableServiceIds.includes('__packages__')
                            ? 'bg-[#261c18] text-white border-[#261c18]'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        All Haircut Packages
                      </button>
                      {services.map((svc) => {
                        const selected = editingPromo.applicableServiceIds.includes(svc.id);
                        return (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => toggleApplicableService(svc.id)}
                            className={`px-2.5 py-1 rounded-lg border text-xs ${
                              selected
                                ? 'bg-[#261c18] text-white border-[#261c18]'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            {svc.name} (₹{svc.price})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Haircut Offer Banner Presets */}
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-slate-700 block mb-1.5">
                      Women’s Haircut Banner Image
                    </span>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {ZIYA_OFFER_BANNER_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setEditingPromo({ ...editingPromo, bannerImageUrl: preset.url })
                          }
                          className={`px-2.5 py-1 rounded-lg border text-xs ${
                            editingPromo.bannerImageUrl === preset.url
                              ? 'border-[#261c18] bg-[#f7efe9] font-semibold'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editingPromo.bannerImageUrl}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, bannerImageUrl: e.target.value })
                      }
                      placeholder="Banner image URL"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <label className="block sm:col-span-2">
                    <span className="font-semibold text-slate-700">Terms &amp; Conditions</span>
                    <textarea
                      rows={2}
                      value={editingPromo.termsConditions}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, termsConditions: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </label>
                </div>

                {/* Live Customer Offer Card Preview */}
                <div className="rounded-2xl border border-[#e7d7cc] bg-[#fdfaf6] p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8f6856]">
                      Customer Website Preview
                    </span>
                    <div className="mt-3 rounded-xl overflow-hidden border border-[#e7d7cc] bg-white">
                      <div className="relative h-40 bg-slate-100">
                        {editingPromo.bannerImageUrl && (
                          <img
                            src={editingPromo.bannerImageUrl}
                            alt={editingPromo.title || 'Haircut offer preview'}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-[#261c18] text-white px-3 py-1 text-[11px] font-bold">
                          {formatOfferDiscountBadge(editingPromo)}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="text-[11px] text-slate-500 flex justify-between">
                          <span>{formatValidityRange(editingPromo.startsAt, editingPromo.endsAt)}</span>
                          <span>Min. ₹{editingPromo.minBookingAmount || 0}</span>
                        </div>
                        <h5 className="font-bold text-slate-900">
                          {editingPromo.title || 'Untitled Haircut Offer'}
                        </h5>
                        <p className="text-xs text-slate-600">
                          {editingPromo.description || 'Offer description preview…'}
                        </p>
                        <div className="pt-2 flex items-center justify-between border-t">
                          <code className="font-mono text-xs font-bold bg-[#f7efe9] px-2.5 py-1 rounded">
                            {editingPromo.couponCode || 'CODE'}
                          </code>
                          <span className="text-xs font-semibold text-[#8f6856]">Book Now →</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void handleSavePromotion({ ...editingPromo, demoApproved: true })
                      }
                      className="flex-1 rounded-xl bg-[#261c18] py-2.5 text-xs font-semibold text-white hover:bg-[#3b2c26]"
                    >
                      {busy ? 'Saving…' : 'Save & Publish Offer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPromo(null)}
                      className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Promotions Table / Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {(data?.promotions || []).map((promo) => (
              <article
                key={promo.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="relative h-36 bg-slate-100">
                    {promo.bannerImageUrl && (
                      <img
                        src={promo.bannerImageUrl}
                        alt={promo.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute top-2.5 left-2.5 rounded-full bg-[#261c18] text-white px-2.5 py-0.5 text-[11px] font-bold">
                      {formatOfferDiscountBadge(promo)}
                    </span>
                    <span
                      className={`absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        promo.isActive !== false
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {promo.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <code className="rounded bg-[#f7efe9] px-2 py-0.5 font-mono text-xs font-bold text-[#261c18]">
                        {promo.couponCode}
                      </code>
                      {promo.isDemo && !promo.demoApproved && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                          <Sparkles size={10} /> Demo Seed
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{promo.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{promo.description}</p>
                    <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                      <div>
                        Min. ₹{promo.minBookingAmount} · {formatValidityRange(promo.startsAt, promo.endsAt)}
                      </div>
                      <div>
                        Redemptions: <strong>{promo.usedCount ?? 0}</strong>
                        {promo.maxTotalUses ? ` / ${promo.maxTotalUses}` : ''} (max{' '}
                        {promo.maxUsesPerCustomer}/customer)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t p-3 bg-slate-50 flex flex-wrap gap-2 justify-between items-center">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingPromo(promo)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-slate-100"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void handleSavePromotion({
                          ...promo,
                          isActive: promo.isActive === false,
                          demoApproved: Boolean(promo.demoApproved),
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-slate-100"
                    >
                      {promo.isActive !== false ? 'Deactivate' : 'Activate'}
                    </button>
                    {promo.isDemo && !promo.demoApproved && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void handleSavePromotion({ ...promo, demoApproved: true })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        <Check size={12} /> Approve Live
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDeletePromotion(promo)}
                    aria-label={`Delete ${promo.title}`}
                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Redemption Log */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="font-bold text-sm mb-3">Recent Coupon Redemptions</h4>
            {data?.redemptions && data.redemptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Coupon</th>
                      <th className="py-2 pr-3">Original</th>
                      <th className="py-2 pr-3">Discount</th>
                      <th className="py-2 pr-3">Final</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.redemptions.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-3 font-mono font-bold">{r.couponCode}</td>
                        <td className="py-2 pr-3">₹{r.originalAmount}</td>
                        <td className="py-2 pr-3 text-emerald-700">−₹{r.discountAmount}</td>
                        <td className="py-2 pr-3 font-semibold">₹{r.finalAmount}</td>
                        <td className="py-2 pr-3 capitalize">{r.status}</td>
                        <td className="py-2 text-slate-500">
                          {new Date(r.redeemedAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No customer coupon redemptions recorded yet. Real customer bookings using Ziya coupons appear here automatically.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ZIYA STYLE REWARDS MANAGEMENT */}
      {subTab === 'loyalty' && (
        <div className="space-y-6">
          {/* Program Rules Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ziya Style Rewards Configuration</h3>
                <p className="text-xs text-slate-600">
                  Points are automatically calculated and credited by Supabase when a women’s haircut appointment is marked Completed.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {settingsDraft.isDemo && !settingsDraft.demoApproved && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSaveLoyaltySettings(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    <ShieldCheck size={14} /> Approve Sample Program as Official
                  </button>
                )}
                <label className="inline-flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={settingsDraft.isEnabled}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, isEnabled: e.target.checked })
                    }
                  />
                  Program Enabled
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-4 text-xs">
              <label className="block sm:col-span-2">
                <span className="font-semibold text-slate-700">Program Name</span>
                <input
                  type="text"
                  value={settingsDraft.programName}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, programName: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="font-semibold text-slate-700">Points per ₹100 Spent</span>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.pointsPer100Inr}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      pointsPer100Inr: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="font-semibold text-slate-700">Min. Eligible Spend (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.minEligibleSpendInr}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      minEligibleSpendInr: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="font-semibold text-slate-700">Customer Earning Summary</span>
                <input
                  type="text"
                  value={settingsDraft.rulesSummary}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, rulesSummary: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="font-semibold text-slate-700">Program Terms &amp; Conditions</span>
                <input
                  type="text"
                  value={settingsDraft.termsConditions}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, termsConditions: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSaveLoyaltySettings(false)}
                className="rounded-xl bg-[#261c18] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b2c26]"
              >
                {busy ? 'Saving…' : 'Save Program Rules'}
              </button>
            </div>
          </div>

          {/* Reward Tiers CRUD */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base">Redeemable Haircut Reward Tiers</h4>
              <button
                type="button"
                onClick={() =>
                  setEditingReward({
                    ...EMPTY_REWARD_DRAFT,
                    displayOrder: (data?.loyaltyRewards?.length || 0) + 1,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#261c18] px-3.5 py-2 text-xs font-semibold text-white"
              >
                <Plus size={14} /> Add Reward Tier
              </button>
            </div>

            {editingReward && (
              <div className="rounded-2xl border border-[#dcc8ba] bg-[#fdfaf6] p-5 space-y-4 text-xs">
                <h5 className="font-bold text-sm">
                  {editingReward.id ? `Edit Reward: ${editingReward.title}` : 'New Reward Tier'}
                </h5>
                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="block sm:col-span-2">
                    <span className="font-semibold">Reward Title *</span>
                    <input
                      type="text"
                      value={editingReward.title}
                      onChange={(e) =>
                        setEditingReward({ ...editingReward, title: e.target.value })
                      }
                      placeholder="e.g. ₹50 Haircut Discount"
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold">Points Required *</span>
                    <input
                      type="number"
                      min={1}
                      value={editingReward.pointsCost}
                      onChange={(e) =>
                        setEditingReward({
                          ...editingReward,
                          pointsCost: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold">Reward Type</span>
                    <select
                      value={editingReward.rewardType}
                      onChange={(e) =>
                        setEditingReward({
                          ...editingReward,
                          rewardType: e.target.value as 'flat_discount' | 'percentage_discount',
                        })
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                    >
                      <option value="flat_discount">Flat ₹ Discount</option>
                      <option value="percentage_discount">Percentage % Discount</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-semibold">Discount Value</span>
                    <input
                      type="number"
                      min={1}
                      value={editingReward.discountValue}
                      onChange={(e) =>
                        setEditingReward({
                          ...editingReward,
                          discountValue: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold">Min. Booking Amount (₹)</span>
                    <input
                      type="number"
                      min={0}
                      value={editingReward.minBookingAmount}
                      onChange={(e) =>
                        setEditingReward({
                          ...editingReward,
                          minBookingAmount: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block sm:col-span-3">
                    <span className="font-semibold">Description</span>
                    <input
                      type="text"
                      value={editingReward.description}
                      onChange={(e) =>
                        setEditingReward({ ...editingReward, description: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingReward(null)}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSaveReward(editingReward)}
                    className="rounded-xl bg-[#261c18] px-4 py-2 font-semibold text-white"
                  >
                    Save Reward Tier
                  </button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              {(data?.loyaltyRewards || []).map((rew) => (
                <div
                  key={rew.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f7efe9] px-2.5 py-0.5 text-xs font-bold text-[#261c18]">
                        <Award size={12} /> {rew.pointsCost} pts
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rew.isActive !== false
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {rew.isActive !== false ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm">{rew.title}</h5>
                    <p className="text-xs text-slate-600">{rew.description}</p>
                    <p className="text-[11px] text-slate-500">
                      Min. booking ₹{rew.minBookingAmount} · Valid {rew.validityDays} days
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingReward(rew)}
                        className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleSaveReward({ ...rew, isActive: rew.isActive === false })
                        }
                        className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
                      >
                        {rew.isActive !== false ? 'Pause' : 'Activate'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteReward(rew)}
                      aria-label={`Delete ${rew.title}`}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Points Balances + Manual Point Adjustment + Ledger */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <h4 className="font-bold text-sm">Customer Loyalty Balances</h4>
              {data?.customerBalances && data.customerBalances.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b text-slate-500">
                      <tr>
                        <th className="py-2 pr-2">Customer</th>
                        <th className="py-2 pr-2">Balance</th>
                        <th className="py-2 pr-2">Earned</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.customerBalances.map((cust) => (
                        <tr key={cust.customerId}>
                          <td className="py-2 pr-2">
                            <div className="font-semibold">{cust.customerName}</div>
                            <div className="text-[11px] text-slate-500">{cust.customerEmail}</div>
                          </td>
                          <td className="py-2 pr-2 font-bold">{cust.balance} pts</td>
                          <td className="py-2 pr-2 text-slate-600">{cust.totalEarned} pts</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => setAdjustCustomerId(cust.customerId)}
                              className="underline text-[#8f6856] font-semibold"
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No customer point balances yet. Balances appear automatically once real customers complete women’s haircut appointments.
                </p>
              )}

              <form onSubmit={handleManualAdjust} className="border-t pt-4 space-y-3 text-xs">
                <h5 className="font-bold text-slate-800">Manual Points Adjustment (Audited)</h5>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="font-semibold text-slate-600">Customer User UUID</span>
                    <input
                      type="text"
                      value={adjustCustomerId}
                      onChange={(e) => setAdjustCustomerId(e.target.value)}
                      placeholder="Select customer above or paste UUID"
                      className="mt-1 w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-slate-600">Points Delta (+ or −)</span>
                    <input
                      type="number"
                      value={adjustPointsDelta}
                      onChange={(e) => setAdjustPointsDelta(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="font-semibold text-slate-600">Audit Reason *</span>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Goodwill bonus for referral"
                    className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#261c18] px-4 py-2 font-semibold text-white"
                >
                  Apply Point Adjustment
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <h4 className="font-bold text-sm">Points Ledger Audit Trail</h4>
              {data?.recentLedger && data.recentLedger.length > 0 ? (
                <ul className="divide-y text-xs max-h-96 overflow-y-auto">
                  {data.recentLedger.map((entry) => (
                    <li key={entry.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{entry.description}</div>
                        <div className="text-[11px] text-slate-500">
                          {entry.customerEmail || entry.customerId} ·{' '}
                          {new Date(entry.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold ${
                            entry.pointsDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {entry.pointsDelta >= 0 ? `+${entry.pointsDelta}` : entry.pointsDelta} pts
                        </span>
                        <div className="text-[10px] text-slate-500">
                          Bal: {entry.balanceAfter} pts
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  No ledger entries yet. Every automatic booking credit, reward redemption, refund reversal, and admin adjustment is recorded here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HAIRCUT ENQUIRIES */}
      {subTab === 'enquiries' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="font-bold text-base">Customer Haircut Consultation Enquiries</h3>
            <p className="text-xs text-slate-600">
              Messages submitted from the Ziya Women’s Hair Studio website contact form.
            </p>
          </div>
          {data?.enquiries && data.enquiries.length > 0 ? (
            <div className="divide-y">
              {data.enquiries.map((enq) => (
                <div key={enq.id} className="py-4 flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-slate-900">{enq.name}</strong>
                      <span className="rounded-full bg-[#f7efe9] px-2.5 py-0.5 font-semibold text-[#261c18]">
                        {enq.serviceName || 'Haircut Consultation'}
                      </span>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100">
                        {enq.status}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      Phone: <a href={`tel:${enq.phone}`} className="underline">{enq.phone}</a>
                      {enq.email ? ` · ${enq.email}` : ''}
                      {enq.preferredDate ? ` · Preferred date: ${enq.preferredDate}` : ''}
                    </div>
                    <p className="text-slate-800 pt-1">{enq.message}</p>
                  </div>
                  <div className="flex gap-1.5 text-xs">
                    {(['read', 'replied', 'closed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={busy || enq.status === st}
                        onClick={() => void handleEnquiryStatus(enq.id, st)}
                        className="rounded-lg border px-2.5 py-1 capitalize hover:bg-slate-50 disabled:opacity-50"
                      >
                        Mark {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No haircut consultation enquiries yet. Customer messages from the website contact form appear here immediately.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
