import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Copy,
  Gift,
  History,
  Scissors,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Ticket,
} from 'lucide-react';
import type { LoyaltyConfig, SalonProfile, SalonService } from '../../types';
import { supabase } from '../../lib/supabase';
import { loyaltyTheme } from '../../lib/loyaltyTheme';
import { promotionActive, usePromotionClock } from '../../lib/promotionStatus';
import { InlineEditable } from '../InlineEditable';
import { LUXURY_EDITORIAL_IMAGES } from '../../lib/luxuryEditorial';
import {
  ZIYA_DEMO_LOYALTY_REWARDS,
  ZIYA_DEMO_LOYALTY_SETTINGS,
  ZIYA_DEMO_PROMOTIONS,
  findEligibleServiceForOffer,
  formatOfferDiscountBadge,
  formatValidityRange,
  type ZiyaCustomerLoyaltyState,
  type ZiyaLoyaltyReward,
  type ZiyaLoyaltySettings,
  type ZiyaPromotion,
  type ZiyaPublicPayload,
} from '../../lib/ziyaPromotionsLoyalty';

export function useZiyaPublicStorefrontData(slug: string, customerSignedIn: boolean) {
  const [payload, setPayload] = useState<ZiyaPublicPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const cleanSlug = (slug || '').trim().toLowerCase();
    if (!cleanSlug) {
      setPayload(null);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('studioflow_ziya_public_offers_and_loyalty', {
        p_slug: cleanSlug,
      });
      if (!error && data && typeof data === 'object' && (data as ZiyaPublicPayload).found) {
        setPayload(data as ZiyaPublicPayload);
      }
    } catch {
      // Keep graceful preview fallback if offline or unpublished
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void reload();
  }, [reload, customerSignedIn]);

  return { payload, loading, reload };
}

interface ZiyaPromotionsSectionProps {
  profile: SalonProfile;
  services: SalonService[];
  publicData: ZiyaPublicPayload | null;
  readOnly?: boolean;
  isEditingActive?: boolean;
  setProfile?: React.Dispatch<React.SetStateAction<SalonProfile>>;
  onManage?: (section: string) => void;
  onBookOffer: (service?: SalonService, couponCode?: string) => void;
}

export const ZiyaPromotionsSection: React.FC<ZiyaPromotionsSectionProps> = ({
  profile,
  services,
  publicData,
  readOnly = false,
  isEditingActive = false,
  setProfile,
  onManage,
  onBookOffer,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  const promotionNow = usePromotionClock();
  const canManage = !readOnly && !!onManage;
  const campaign = profile.promoCampaign;
  const hasInlineCampaign = promotionActive(campaign, promotionNow) && !!campaign;

  const promotions: ZiyaPromotion[] = useMemo(() => {
    if (publicData && publicData.found) {
      return Array.isArray(publicData.promotions) ? publicData.promotions : [];
    }
    return ZIYA_DEMO_PROMOTIONS;
  }, [publicData]);

  const hasDemoOffers = promotions.some((offer) => offer.isDemo);
  const usageMap = publicData?.customer?.promoUsage || {};

  const handleCopyCode = async (code: string) => {
    setCopyFeedback('');
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setCopyFeedback(`Coupon code ${code} copied! Apply it at haircut checkout.`);
      window.setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 2800);
    } catch {
      setCopiedCode(code);
      setCopyFeedback(`Use coupon code ${code} when confirming your haircut appointment.`);
    }
  };

  return (
    <section id="salon-promo" data-section="promo" className="le-section le-ziya-promo-section">
      <div className="le-container">
        <div className="le-section-header le-ziya-section-head">
          <div>
            <span className="le-eyebrow">Exclusive Haircut Privileges</span>
            <InlineEditable
              tag="h2"
              className="le-h2"
              value={profile.sectionHeadings?.promoTitle || 'Promotions & Haircut Offers'}
              isEditingActive={isEditingActive && !readOnly && !!setProfile}
              onSave={(val) =>
                setProfile?.((prev) => ({
                  ...prev,
                  sectionHeadings: { ...prev.sectionHeadings, promoTitle: String(val) },
                }))
              }
            />
            <p className="le-lead">
              Curated seasonal privileges on women’s precision haircuts, face-framing layers and signature styling packages.
            </p>
          </div>
          <div className="le-ziya-head-actions">
            {hasDemoOffers && (
              <span className="le-ziya-demo-pill" title="Sample salon offers — editable & approvable by Salon Admin">
                <Sparkles size={13} aria-hidden="true" />
                Sample Studio Offers · Admin Editable
              </span>
            )}
            {canManage && (
              <button
                type="button"
                className="le-btn le-btn-outline le-btn-sm"
                onClick={() => onManage?.('ziya_studio')}
              >
                Manage Offers & Coupons
              </button>
            )}
          </div>
        </div>

        {copyFeedback && (
          <div className="le-ziya-toast" role="status" aria-live="polite">
            <Check size={15} aria-hidden="true" />
            <span>{copyFeedback}</span>
          </div>
        )}

        {hasInlineCampaign && campaign && (
          <article className="le-ziya-campaign-highlight">
            {campaign.imageUrl && (
              <div className="le-ziya-campaign-media">
                <img
                  src={campaign.imageUrl}
                  alt={campaign.headline || 'Featured haircut offer'}
                  loading="lazy"
                />
              </div>
            )}
            <div className="le-ziya-campaign-body">
              <span className="le-eyebrow">Featured Salon Announcement</span>
              <InlineEditable
                tag="h3"
                className="le-h3"
                value={campaign.headline || ''}
                isEditingActive={isEditingActive && !readOnly && !!setProfile}
                onSave={(value) =>
                  setProfile?.((prev) =>
                    prev.promoCampaign
                      ? { ...prev, promoCampaign: { ...prev.promoCampaign, headline: String(value) } }
                      : prev,
                  )
                }
              />
              {campaign.customOfferText && <p className="le-ziya-campaign-offer">{campaign.customOfferText}</p>}
              {campaign.subtext && <p className="le-ziya-campaign-sub">{campaign.subtext}</p>}
              {campaign.promoCode && (
                <div className="le-ziya-code-row">
                  <span className="le-ziya-code-pill">
                    <Tag size={13} aria-hidden="true" /> {campaign.promoCode}
                  </span>
                  <button
                    type="button"
                    className="le-ziya-copy-btn"
                    onClick={() => void handleCopyCode(campaign.promoCode!)}
                  >
                    <Copy size={13} aria-hidden="true" />
                    {copiedCode === campaign.promoCode ? 'Copied!' : 'Copy Coupon Code'}
                  </button>
                </div>
              )}
              <div className="le-ziya-offer-actions">
                <button
                  type="button"
                  className="le-btn le-btn-primary le-btn-sm"
                  onClick={() =>
                    onBookOffer(
                      services.find((s) => s.id === campaign.selectedServiceId) || services[0],
                      campaign.promoCode || undefined,
                    )
                  }
                >
                  Book Now
                </button>
              </div>
            </div>
          </article>
        )}

        {promotions.length > 0 ? (
          <div className="le-ziya-promo-grid">
            {promotions.map((offer) => {
              const targetService = findEligibleServiceForOffer(offer, services);
              const customerUsed = Number(usageMap[offer.couponCode] || 0);
              const customerLimitReached =
                offer.maxUsesPerCustomer > 0 && customerUsed >= offer.maxUsesPerCustomer;
              const imgSrc = offer.bannerImageUrl || LUXURY_EDITORIAL_IMAGES.services.butterfly.src;

              return (
                <article key={offer.id} className="le-ziya-promo-card">
                  <div className="le-ziya-promo-media">
                    <img src={imgSrc} alt={`${offer.title} — women's haircut offer`} loading="lazy" />
                    <span className="le-ziya-discount-badge">{formatOfferDiscountBadge(offer)}</span>
                    {offer.isDemo && <span className="le-ziya-card-demo-tag">Sample Offer</span>}
                  </div>

                  <div className="le-ziya-promo-content">
                    <div className="le-ziya-promo-meta">
                      <span>{formatValidityRange(offer.startsAt, offer.endsAt)}</span>
                      {offer.minBookingAmount > 0 && (
                        <span>Min. ₹{Number(offer.minBookingAmount).toLocaleString('en-IN')}</span>
                      )}
                    </div>

                    <h3 className="le-ziya-promo-title">{offer.title}</h3>
                    <p className="le-ziya-promo-desc">{offer.description}</p>

                    <div className="le-ziya-coupon-bar">
                      <div className="le-ziya-coupon-code" aria-label={`Coupon code ${offer.couponCode}`}>
                        <Ticket size={14} aria-hidden="true" />
                        <strong>{offer.couponCode}</strong>
                      </div>
                      <button
                        type="button"
                        className="le-ziya-copy-btn"
                        onClick={() => void handleCopyCode(offer.couponCode)}
                      >
                        {copiedCode === offer.couponCode ? (
                          <>
                            <Check size={13} aria-hidden="true" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} aria-hidden="true" /> Copy Coupon Code
                          </>
                        )}
                      </button>
                    </div>

                    {offer.termsConditions && (
                      <details className="le-ziya-terms">
                        <summary>Terms &amp; eligibility</summary>
                        <p>{offer.termsConditions}</p>
                      </details>
                    )}

                    <div className="le-ziya-promo-footer">
                      <button
                        type="button"
                        className="le-btn le-btn-primary le-btn-sm le-btn-full"
                        disabled={customerLimitReached}
                        onClick={() => onBookOffer(targetService, offer.couponCode)}
                      >
                        {customerLimitReached ? 'Offer Already Redeemed' : 'Book Now'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          !hasInlineCampaign && (
            <div className="le-ziya-empty-card">
              <Scissors size={22} aria-hidden="true" />
              <p>
                {canManage
                  ? 'No active haircut promotions right now. Open Manage Offers & Coupons to activate or create a studio offer.'
                  : 'Seasonal women’s haircut privileges will be posted here by Ziya Women’s Hair Studio.'}
              </p>
            </div>
          )
        )}
      </div>
    </section>
  );
};

interface ZiyaLoyaltySectionProps {
  profile: SalonProfile;
  services: SalonService[];
  loyaltyConfig?: LoyaltyConfig;
  publicData: ZiyaPublicPayload | null;
  onRefreshPublicData: () => Promise<void>;
  customerSignedIn?: boolean;
  onCustomerAccount?: (mode?: 'signin' | 'signup') => void;
  readOnly?: boolean;
  isEditingActive?: boolean;
  setProfile?: React.Dispatch<React.SetStateAction<SalonProfile>>;
  onManage?: (section: string) => void;
  onBookWithVoucher: (service?: SalonService, couponCode?: string) => void;
}

export const ZiyaLoyaltySection: React.FC<ZiyaLoyaltySectionProps> = ({
  profile,
  services,
  loyaltyConfig,
  publicData,
  onRefreshPublicData,
  customerSignedIn = false,
  onCustomerAccount,
  readOnly = false,
  isEditingActive = false,
  setProfile,
  onManage,
  onBookWithVoucher,
}) => {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const canManage = !readOnly && !!onManage;
  const rewardTheme = loyaltyTheme(profile);

  const settings: ZiyaLoyaltySettings | null = useMemo(() => {
    if (publicData && publicData.found) {
      return publicData.loyalty?.settings || null;
    }
    return ZIYA_DEMO_LOYALTY_SETTINGS;
  }, [publicData]);

  // Support custom owner-configured loyaltyConfig overrides while keeping Ziya's haircut-only rewards as default
  const customPropRewards = useMemo(() => {
    if (!loyaltyConfig?.programEnabled || !Array.isArray(loyaltyConfig.rewards)) return [];
    const active = loyaltyConfig.rewards.filter((r) => r.isActive);
    const isUntouchedGlobalDefault =
      active.length > 0 && active.every((r) => String(r.id).startsWith('rew-'));
    return isUntouchedGlobalDefault ? [] : active;
  }, [loyaltyConfig]);

  const rewards: ZiyaLoyaltyReward[] = useMemo(() => {
    if (publicData && publicData.found && Array.isArray(publicData.loyalty?.rewards)) {
      return publicData.loyalty.rewards;
    }
    if (customPropRewards.length > 0) {
      return customPropRewards.map((r, idx) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        pointsCost: r.requiredPoints,
        rewardType: r.rewardType === 'percentage_discount' ? 'percentage_discount' : 'flat_discount',
        discountValue: Number(r.discountValue || 50),
        minBookingAmount: 0,
        applicableServiceIds: [],
        validityDays: 90,
        displayOrder: idx + 1,
        isActive: true,
        isDemo: false,
      }));
    }
    return ZIYA_DEMO_LOYALTY_REWARDS;
  }, [publicData, customPropRewards]);

  const customerState: ZiyaCustomerLoyaltyState | null = publicData?.customer || null;
  const currentBalance = customerState?.balance || 0;
  const totalEarned = customerState?.totalEarned || 0;
  const totalRedeemed = customerState?.totalRedeemed || 0;

  const sortedRewards = useMemo(
    () => [...rewards].sort((a, b) => a.pointsCost - b.pointsCost),
    [rewards],
  );
  const nextReward = useMemo(
    () => sortedRewards.find((r) => r.pointsCost > currentBalance) || sortedRewards[sortedRewards.length - 1] || null,
    [sortedRewards, currentBalance],
  );
  const progressPct = useMemo(() => {
    if (!nextReward || nextReward.pointsCost <= 0) return 0;
    return Math.min(100, Math.round((currentBalance / nextReward.pointsCost) * 100));
  }, [currentBalance, nextReward]);

  const handleRedeem = async (reward: ZiyaLoyaltyReward) => {
    setStatusNotice(null);
    if (!customerSignedIn) {
      onCustomerAccount?.('signin');
      return;
    }
    const slug = (profile.subdomain || '').trim();
    if (!slug) {
      setStatusNotice({
        tone: 'err',
        text: 'Publish this studio website first to enable live customer point redemptions.',
      });
      return;
    }
    setRedeemingId(reward.id);
    try {
      const requestId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : undefined;
      const { data, error } = await supabase.rpc('studioflow_ziya_redeem_loyalty_reward', {
        p_slug: slug,
        p_reward_id: reward.id,
        p_request_id: requestId,
      });
      if (error) throw error;
      const code = (data as any)?.couponCode || '';
      setStatusNotice({
        tone: 'ok',
        text: `Redeemed "${reward.title}"! Your haircut voucher ${code} is ready below.`,
      });
      await onRefreshPublicData();
    } catch (err) {
      setStatusNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to redeem reward right now.',
      });
    } finally {
      setRedeemingId(null);
    }
  };

  const handleCopyVoucher = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore clipboard restriction
    }
    setCopiedVoucher(code);
    window.setTimeout(() => setCopiedVoucher((prev) => (prev === code ? null : prev)), 2500);
  };

  const programEnabled = settings ? settings.isEnabled !== false : true;
  const headingFallback = settings?.programName || 'Ziya Style Rewards';

  return (
    <section
      id="salon-loyalty"
      data-section="loyalty"
      data-loyalty-template={profile.businessType}
      data-loyalty-mode={rewardTheme.dark ? 'dark' : 'light'}
      className="le-section le-ziya-loyalty-section sf-loyalty"
      style={rewardTheme.style as React.CSSProperties}
    >
      <div className="le-container">
        <div className="le-section-header le-ziya-section-head">
          <div>
            <span className="le-eyebrow">Women’s Haircut Membership</span>
            <div className="le-ziya-loyalty-title-row">
              <span className="sf-loyalty-icon" aria-hidden="true">
                <Gift size={22} />
              </span>
              <InlineEditable
                tag="h2"
                className="le-h2"
                value={profile.sectionHeadings?.loyaltyTitle || headingFallback}
                isEditingActive={isEditingActive && !readOnly && !!setProfile}
                onSave={(value) =>
                  setProfile?.((prev) => ({
                    ...prev,
                    sectionHeadings: { ...prev.sectionHeadings, loyaltyTitle: String(value) },
                  }))
                }
              />
            </div>
            <p className="le-lead">
              {settings?.rulesSummary ||
                'Earn 1 Ziya Style Point for every ₹100 spent on eligible completed women’s haircut appointments.'}
            </p>
          </div>

          <div className="le-ziya-head-actions">
            {settings?.isDemo && (
              <span className="le-ziya-demo-pill" title="Sample reward program — configurable by Salon Admin">
                <Award size={13} aria-hidden="true" />
                Sample Rewards Program · Admin Configurable
              </span>
            )}
            {canManage && (
              <button
                type="button"
                className="le-btn le-btn-outline le-btn-sm"
                onClick={() => onManage?.('ziya_studio')}
              >
                Manage Ziya Style Rewards
              </button>
            )}
          </div>
        </div>

        {!programEnabled ? (
          <div className="le-ziya-empty-card">
            <Gift size={22} aria-hidden="true" />
            <p>
              {canManage
                ? 'Ziya Style Rewards is currently paused. Open Manage Ziya Style Rewards to re-enable customer point earning.'
                : 'Ziya Style Rewards enrollment is temporarily paused by the salon.'}
            </p>
          </div>
        ) : (
          <>
            {/* Customer Balance, Progress & Earning Rules Summary */}
            <div className="le-ziya-loyalty-overview">
              <div className="le-ziya-balance-card">
                <div className="le-ziya-balance-top">
                  <div>
                    <span className="le-ziya-balance-label">
                      {customerSignedIn ? 'Your Ziya Style Balance' : 'Member Points & Progress'}
                    </span>
                    <div className="le-ziya-balance-figure">
                      <strong>{currentBalance.toLocaleString('en-IN')}</strong>
                      <span>Style Points</span>
                    </div>
                  </div>
                  <div className="le-ziya-earn-pill">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>
                      Earn {settings?.pointsPer100Inr ?? 1} pt / ₹100
                      {settings?.pointsPerVisit ? ` + ${settings.pointsPerVisit} visit bonus` : ''}
                    </span>
                  </div>
                </div>

                {customerSignedIn ? (
                  <div className="le-ziya-stats-strip">
                    <div>
                      <span>Total Earned</span>
                      <strong>{totalEarned.toLocaleString('en-IN')} pts</strong>
                    </div>
                    <div>
                      <span>Total Redeemed</span>
                      <strong>{totalRedeemed.toLocaleString('en-IN')} pts</strong>
                    </div>
                    <div>
                      <span>Active Vouchers</span>
                      <strong>{customerState?.activeVouchers?.length || 0}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="le-ziya-guest-note">
                    Sign in to view your live haircut points balance, track completed appointment rewards, and redeem instant haircut vouchers.
                  </p>
                )}

                {nextReward && (
                  <div className="le-ziya-progress-wrap">
                    <div className="le-ziya-progress-labels">
                      <span>
                        {currentBalance >= nextReward.pointsCost
                          ? `Reward unlocked: ${nextReward.title}`
                          : `Next reward: ${nextReward.title}`}
                      </span>
                      <span>
                        {currentBalance} / {nextReward.pointsCost} pts
                      </span>
                    </div>
                    <div
                      className="le-ziya-progress-track"
                      role="progressbar"
                      aria-valuenow={progressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="le-ziya-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                )}

                <div className="le-ziya-balance-actions">
                  {!customerSignedIn && onCustomerAccount && (
                    <button
                      type="button"
                      className="le-btn le-btn-primary le-btn-sm"
                      onClick={() => onCustomerAccount('signin')}
                    >
                      Sign In to View Points &amp; Redeem
                    </button>
                  )}
                  {customerSignedIn && (
                    <button
                      type="button"
                      className="le-btn le-btn-outline le-btn-sm"
                      onClick={() => setShowHistory((prev) => !prev)}
                    >
                      <History size={14} aria-hidden="true" />
                      {showHistory ? 'Hide Points History' : 'Points & Redemption History'}
                    </button>
                  )}
                </div>
              </div>

              <div className="le-ziya-rules-card">
                <h3>How Ziya Style Rewards Works</h3>
                <ol className="le-ziya-steps-list">
                  <li>
                    <strong>1. Book &amp; Enjoy Your Haircut</strong>
                    <span>Book any women’s haircut or Wash &amp; Styling package online.</span>
                  </li>
                  <li>
                    <strong>
                      2. Earn {settings?.pointsPer100Inr ?? 1} Point per ₹100 Automatically
                    </strong>
                    <span>Points credit automatically once your salon visit is marked Completed.</span>
                  </li>
                  <li>
                    <strong>3. Redeem for Instant Haircut Savings</strong>
                    <span>Exchange 100, 200 or 300 points for verified haircut discount vouchers.</span>
                  </li>
                </ol>
                {settings?.termsConditions && (
                  <p className="le-ziya-rules-terms">
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>{settings.termsConditions}</span>
                  </p>
                )}
              </div>
            </div>

            {statusNotice && (
              <div
                className={`le-ziya-toast ${statusNotice.tone === 'err' ? 'is-error' : ''}`}
                role="status"
                aria-live="polite"
              >
                <span>{statusNotice.text}</span>
              </div>
            )}

            {/* Active Redeemed Customer Vouchers */}
            {customerSignedIn && customerState?.activeVouchers && customerState.activeVouchers.length > 0 && (
              <div className="le-ziya-vouchers-box">
                <h3>Your Ready-to-Use Haircut Vouchers</h3>
                <div className="le-ziya-vouchers-grid">
                  {customerState.activeVouchers.map((v) => (
                    <div key={v.id} className="le-ziya-voucher-item">
                      <div>
                        <strong>{v.title}</strong>
                        <span className="le-ziya-voucher-code">{v.couponCode}</span>
                      </div>
                      <div className="le-ziya-voucher-btns">
                        <button
                          type="button"
                          className="le-ziya-copy-btn"
                          onClick={() => void handleCopyVoucher(v.couponCode)}
                        >
                          <Copy size={13} aria-hidden="true" />
                          {copiedVoucher === v.couponCode ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          className="le-btn le-btn-primary le-btn-sm"
                          onClick={() => onBookWithVoucher(services[0], v.couponCode)}
                        >
                          Book Haircut
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expandable Customer Points History Ledger */}
            {customerSignedIn && showHistory && (
              <div className="le-ziya-history-panel">
                <h3>Points Earning &amp; Redemption History</h3>
                {customerState?.ledger && customerState.ledger.length > 0 ? (
                  <ul className="le-ziya-ledger-list">
                    {customerState.ledger.map((entry) => (
                      <li key={entry.id} className="le-ziya-ledger-row">
                        <div>
                          <strong>{entry.description}</strong>
                          <span>
                            {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="le-ziya-ledger-delta">
                          <span className={entry.pointsDelta >= 0 ? 'is-plus' : 'is-minus'}>
                            {entry.pointsDelta >= 0 ? `+${entry.pointsDelta}` : entry.pointsDelta} pts
                          </span>
                          <small>Balance: {entry.balanceAfter} pts</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="le-ziya-ledger-empty">
                    No point transactions yet. Your points will appear here automatically after your first completed haircut appointment.
                  </p>
                )}
              </div>
            )}

            {/* Available Rewards Grid */}
            <div className="sf-loyalty-grid le-ziya-rewards-grid">
              {sortedRewards.map((reward) => {
                const canAfford = customerSignedIn && currentBalance >= reward.pointsCost;
                const pointsNeeded = Math.max(0, reward.pointsCost - currentBalance);
                return (
                  <article className="sf-loyalty-card le-ziya-reward-card" key={reward.id}>
                    <div className="le-ziya-reward-top">
                      <span className="sf-loyalty-points">
                        <Star size={13} aria-hidden="true" />
                        {reward.pointsCost} points required
                      </span>
                      {reward.isDemo && <span className="le-ziya-mini-demo">Sample</span>}
                    </div>
                    <h3>{reward.title}</h3>
                    <p className="sf-loyalty-description">{reward.description}</p>
                    {reward.minBookingAmount > 0 && (
                      <p className="le-ziya-reward-min">
                        Valid on haircut bookings from ₹{Number(reward.minBookingAmount).toLocaleString('en-IN')}
                      </p>
                    )}
                    <div className="sf-loyalty-card-footer le-ziya-reward-actions">
                      <button
                        type="button"
                        className={`le-btn le-btn-sm le-btn-full ${canAfford || !customerSignedIn ? 'le-btn-primary' : 'le-btn-outline'}`}
                        disabled={customerSignedIn && !canAfford || redeemingId === reward.id}
                        onClick={() => void handleRedeem(reward)}
                      >
                        {redeemingId === reward.id
                          ? 'Redeeming…'
                          : !customerSignedIn
                            ? 'Sign In to Redeem'
                            : canAfford
                              ? 'Redeem Reward'
                              : `${pointsNeeded} more pts needed`}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

interface ZiyaContactFormProps {
  profile: SalonProfile;
  services: SalonService[];
}

export const ZiyaContactForm: React.FC<ZiyaContactFormProps> = ({ profile, services }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceName, setServiceName] = useState(
    () => services[0]?.name || 'Layer Haircut',
  );
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanMsg = message.trim();

    if (cleanName.length < 2) {
      setFeedback({ tone: 'err', text: 'Please enter your full name.' });
      return;
    }
    if (cleanPhone.replace(/[^0-9]/g, '').length < 7) {
      setFeedback({ tone: 'err', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (cleanEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setFeedback({ tone: 'err', text: 'Please enter a valid email address or leave it blank.' });
      return;
    }
    if (cleanMsg.length < 5) {
      setFeedback({
        tone: 'err',
        text: 'Please share a brief note about your hair length, texture, or desired haircut style.',
      });
      return;
    }

    const slug = (profile.subdomain || '').trim();
    if (!slug) {
      setFeedback({
        tone: 'ok',
        text: 'Haircut enquiry preview validated! Once this studio website is published, enquiries save directly to your Salon Admin Dashboard.',
      });
      setMessage('');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('studioflow_ziya_submit_enquiry', {
        p_slug: slug,
        p_name: cleanName,
        p_phone: cleanPhone,
        p_email: cleanEmail,
        p_service_name: serviceName,
        p_message: cleanMsg,
        p_preferred_date: preferredDate || null,
      });
      if (error) throw error;
      setFeedback({
        tone: 'ok',
        text: 'Thank you! Your haircut enquiry has been received by Ziya Women’s Hair Studio. Our stylist desk will reach out shortly.',
      });
      setName('');
      setPhone('');
      setEmail('');
      setPreferredDate('');
      setMessage('');
    } catch (err) {
      setFeedback({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not send your enquiry right now. Please call or WhatsApp our studio.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="le-ziya-contact-card" onSubmit={handleSubmit} noValidate>
      <div className="le-ziya-contact-head">
        <span className="le-eyebrow">Ask a Women’s Haircut Specialist</span>
        <h3>Haircut Consultation &amp; Contact Form</h3>
        <p>
          Unsure whether a Butterfly Cut, Layer Cut, Curtain Bangs or Bob suits your face shape? Send us a quick note.
        </p>
      </div>

      <div className="le-ziya-form-grid">
        <label className="le-field">
          <span>Your Name *</span>
          <input
            type="text"
            required
            placeholder="e.g. Ananya Rao"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="le-field">
          <span>Mobile / WhatsApp Number *</span>
          <input
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="le-field">
          <span>Email Address (Optional)</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="le-field">
          <span>Interested Haircut Style</span>
          <select value={serviceName} onChange={(e) => setServiceName(e.target.value)}>
            {services.length > 0 ? (
              services.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))
            ) : (
              <>
                <option value="Layer Haircut">Layer Haircut</option>
                <option value="Butterfly Haircut">Butterfly Haircut</option>
                <option value="Bob Haircut">Bob Haircut</option>
                <option value="Curtain Bangs">Curtain Bangs</option>
                <option value="Haircut Consultation & Face-Shape Styling">
                  Haircut Consultation &amp; Face-Shape Styling
                </option>
              </>
            )}
          </select>
        </label>

        <label className="le-field le-field-full">
          <span>Preferred Visit Date (Optional)</span>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
          />
        </label>

        <label className="le-field le-field-full">
          <span>Your Hair Length, Texture &amp; Question *</span>
          <textarea
            rows={3}
            required
            placeholder="Tell us about your current hair length, natural texture (straight, wavy, curly), and the look you have in mind…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
      </div>

      {feedback && (
        <p
          className={`le-ziya-form-feedback ${feedback.tone === 'err' ? 'is-error' : 'is-success'}`}
          role="status"
          aria-live="polite"
        >
          {feedback.text}
        </p>
      )}

      <button type="submit" className="le-btn le-btn-primary le-btn-full" disabled={submitting}>
        <Send size={15} aria-hidden="true" />
        {submitting ? 'Sending Enquiry…' : 'Send Haircut Enquiry'}
      </button>
    </form>
  );
};
