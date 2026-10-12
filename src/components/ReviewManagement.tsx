import React, { useState, useMemo } from 'react';
import { 
  Star, 
  Plus, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Clock, 
  Sparkles, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  CalendarCheck, 
  MessageSquareQuote, 
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { SalonProfile, SalonService, Appointment, ClientRecord } from '../types';
import type { Testimonial } from '../templateData';
import { CATEGORY_STANDARDIZED_DATA } from '../templateData';
import { TestimonialModal } from './ClientTestimonials';

interface ReviewManagementProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services?: SalonService[];
  appointments?: Appointment[];
  clients?: ClientRecord[];
  onNavigateToPreview?: () => void;
}

type FilterStatus = 'all' | 'approved' | 'pending' | 'hidden';

export const ReviewManagement: React.FC<ReviewManagementProps> = ({
  profile,
  setProfile,
  services = [],
  appointments = [],
  clients = [],
  onNavigateToPreview,
}) => {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Testimonial | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3500);
  };

  // Get current list of reviews from profile (or initial category template defaults)
  const defaultCategoryReviews = useMemo(() => {
    const catData = CATEGORY_STANDARDIZED_DATA[profile.businessType || 'hair_salon'] || CATEGORY_STANDARDIZED_DATA.hair_salon;
    return (catData.reviews || []).map((r, i) => ({
      ...r,
      id: r.id || `preset-rev-${i}`,
      approved: true,
      status: 'approved' as const,
    }));
  }, [profile.businessType]);

  const rawReviews: Testimonial[] = useMemo(() => {
    if (profile.websiteTestimonials && profile.websiteTestimonials.length > 0) {
      return profile.websiteTestimonials.map(r => ({
        ...r,
        approved: r.approved !== false && r.status !== 'pending' && r.status !== 'rejected',
        status: r.status || (r.approved === false ? 'pending' : 'approved'),
      }));
    }
    return defaultCategoryReviews;
  }, [profile.websiteTestimonials, defaultCategoryReviews]);

  // Save updated reviews array to profile
  const updateReviews = (updated: Testimonial[]) => {
    setProfile(prev => ({
      ...prev,
      websiteTestimonials: updated,
    }));
  };

  // Toggle approval / live status of a review
  const handleToggleApprove = (reviewId: string) => {
    const target = rawReviews.find(r => r.id === reviewId);
    if (!target) return;

    const willApprove = !(target.approved && target.status === 'approved');
    const updated = rawReviews.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          approved: willApprove,
          status: willApprove ? ('approved' as const) : ('pending' as const),
        };
      }
      return r;
    });

    updateReviews(updated);
    showToast(willApprove 
      ? `"${target.name}'s" review approved and published to website!` 
      : `"${target.name}'s" review moved to pending (hidden from website).`
    );
  };

  // Approve all currently pending reviews
  const handleApproveAllPending = () => {
    const pendingCount = rawReviews.filter(r => !r.approved || r.status === 'pending').length;
    if (pendingCount === 0) return;

    const updated = rawReviews.map(r => ({
      ...r,
      approved: true,
      status: 'approved' as const,
    }));

    updateReviews(updated);
    showToast(`Approved all ${pendingCount} pending reviews for live website display!`);
  };

  // Delete a review
  const handleDeleteReview = (reviewId: string) => {
    const target = rawReviews.find(r => r.id === reviewId);
    const updated = rawReviews.filter(r => r.id !== reviewId);
    updateReviews(updated);
    showToast(`Deleted review by ${target?.name || 'client'}.`);
  };

  // Open modal for manual creation
  const handleOpenAddModal = (prefill?: Partial<Testimonial>) => {
    if (prefill) {
      setEditingReview({
        id: `rev-${Date.now()}`,
        name: prefill.name || '',
        location: prefill.location || profile.city || 'India',
        rating: prefill.rating || 5,
        serviceName: prefill.serviceName || (services[0]?.name || 'Signature Service'),
        comment: prefill.comment || '',
        avatarUrl: prefill.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        approved: true,
        status: 'approved',
      });
    } else {
      setEditingReview(null);
    }
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (review: Testimonial) => {
    setEditingReview(review);
    setIsModalOpen(true);
  };

  // Save review from modal (add or edit)
  const handleSaveModal = (savedReview: Testimonial) => {
    const exists = rawReviews.some(r => r.id === savedReview.id);
    let updated: Testimonial[];

    if (exists) {
      updated = rawReviews.map(r => r.id === savedReview.id ? savedReview : r);
      showToast(`Updated testimonial for "${savedReview.name}".`);
    } else {
      updated = [savedReview, ...rawReviews];
      showToast(savedReview.approved 
        ? `Added and approved new review from "${savedReview.name}"!` 
        : `Added review from "${savedReview.name}" as pending.`
      );
    }

    updateReviews(updated);
    setIsModalOpen(false);
  };

  // Metrics
  const totalCount = rawReviews.length;
  const approvedCount = rawReviews.filter(r => r.approved && r.status === 'approved').length;
  const pendingCount = rawReviews.filter(r => !r.approved || r.status === 'pending').length;
  const hiddenCount = rawReviews.filter(r => r.status === 'rejected').length;

  const averageRating = useMemo(() => {
    const approvedReviews = rawReviews.filter(r => r.approved && r.status === 'approved');
    if (approvedReviews.length === 0) return 5.0;
    const sum = approvedReviews.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    return Number((sum / approvedReviews.length).toFixed(1));
  }, [rawReviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return rawReviews.filter(review => {
      // Status filter
      if (filterStatus === 'approved' && (!review.approved || review.status !== 'approved')) return false;
      if (filterStatus === 'pending' && (review.approved && review.status === 'approved')) return false;
      if (filterStatus === 'hidden' && review.status !== 'rejected') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = review.name.toLowerCase().includes(q);
        const matchesService = review.serviceName?.toLowerCase().includes(q);
        const matchesComment = review.comment.toLowerCase().includes(q);
        const matchesLocation = review.location?.toLowerCase().includes(q);
        return matchesName || matchesService || matchesComment || matchesLocation;
      }

      return true;
    });
  }, [rawReviews, filterStatus, searchQuery]);

  // Section visibility toggle
  const isWebsiteSectionVisible = profile.websiteSections?.testimonials !== false;
  const handleToggleSectionVisibility = () => {
    setProfile(prev => ({
      ...prev,
      websiteSections: {
        ...(prev.websiteSections || {}),
        testimonials: !isWebsiteSectionVisible,
      },
    }));
    showToast(!isWebsiteSectionVisible 
      ? 'Reviews section enabled on your public website!' 
      : 'Reviews section hidden from your public website.'
    );
  };

  // Recent completed appointments ready for 1-click review creation
  const recentCompletedBookings = useMemo(() => {
    return appointments
      .filter(apt => apt.status === 'completed')
      .slice(0, 4);
  }, [appointments]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toast notification */}
      {toastNotification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* HEADER & QUICK ACTIONS */}
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-slate-900">
                Client Reviews & Testimonials
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, moderate, and approve customer experiences to display on your salon website.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Website visibility switch */}
          <button
            type="button"
            onClick={handleToggleSectionVisibility}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
              isWebsiteSectionVisible 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
            title="Toggle whether testimonials appear on your public website"
          >
            {isWebsiteSectionVisible ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Website Section: Live</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Website Section: Hidden</span>
              </>
            )}
          </button>

          {onNavigateToPreview && (
            <button
              type="button"
              onClick={onNavigateToPreview}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Preview on Site</span>
            </button>
          )}

          {/* Add Review Button */}
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client Review</span>
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reviews */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-bold font-mono-caps">Total Testimonials</span>
            <span className="material-symbols-outlined text-slate-400 text-xl">reviews</span>
          </div>
          <div className="font-display font-extrabold text-2xl text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">In salon portfolio</div>
        </div>

        {/* Approved & Live */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-center text-emerald-600 mb-1">
            <span className="text-xs font-bold font-mono-caps text-slate-500">Live on Website</span>
            <span className="material-symbols-outlined text-emerald-600 text-xl">verified</span>
          </div>
          <div className="font-display font-extrabold text-2xl text-emerald-700">{approvedCount}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">Approved & published</div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-center text-amber-600 mb-1">
            <span className="text-xs font-bold font-mono-caps text-slate-500">Pending Approval</span>
            <span className="material-symbols-outlined text-amber-500 text-xl">pending_actions</span>
          </div>
          <div className="font-display font-extrabold text-2xl text-amber-600">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            {pendingCount > 0 ? 'Action required by owner' : 'All reviews reviewed'}
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-center text-amber-500 mb-1">
            <span className="text-xs font-bold font-mono-caps text-slate-500">Average Rating</span>
            <div className="flex items-center text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="font-display font-extrabold text-2xl text-slate-900 flex items-baseline gap-1.5">
            <span>{averageRating}</span>
            <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Across live client reviews</div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Reviews', count: totalCount },
            { id: 'approved', label: 'Live on Website', count: approvedCount, color: 'text-emerald-700 bg-emerald-50' },
            { id: 'pending', label: 'Pending Approval', count: pendingCount, color: 'text-amber-800 bg-amber-50' },
            { id: 'hidden', label: 'Hidden', count: hiddenCount },
          ].map(tab => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as FilterStatus)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Bulk approve */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client or service…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleApproveAllPending}
              className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve All ({pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* REVIEWS GRID / LIST */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800">No testimonials found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            {searchQuery 
              ? 'No reviews match your search query. Try clearing the filter.' 
              : filterStatus === 'pending'
              ? 'Great news! You have no pending client reviews awaiting moderation.'
              : 'Add authentic reviews from clients who visited your salon to build trust.'}
          </p>
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Review</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReviews.map(review => {
            const isApproved = review.approved && review.status === 'approved';
            return (
              <div
                key={review.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                  isApproved ? 'border-gray-200' : 'border-amber-300 bg-amber-50/20'
                }`}
              >
                <div>
                  {/* Top Header: Client info & Status badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                        {review.avatarUrl ? (
                          <img
                            src={review.avatarUrl}
                            alt={review.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                            }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                            {review.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{review.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {review.location || profile.city || 'India'} • {review.date || 'Recent'}
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isApproved 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {isApproved ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Live</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Rating stars & Service tag */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < (review.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-1 font-mono">
                        {review.rating || 5}.0
                      </span>
                    </div>

                    {review.serviceName && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 max-w-[140px] truncate border border-slate-200">
                        {review.serviceName}
                      </span>
                    )}
                  </div>

                  {/* Review Text */}
                  <p className="text-xs text-slate-700 italic leading-relaxed line-clamp-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    "{review.comment}"
                  </p>
                </div>

                {/* Bottom Action Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Approve / Hide Toggle button */}
                  <button
                    type="button"
                    onClick={() => handleToggleApprove(review.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      isApproved
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isApproved ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide from Site</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve for Site</span>
                      </>
                    )}
                  </button>

                  {/* Edit and Delete icons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(review)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit review details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ONE-CLICK IMPORT FROM COMPLETED CLIENT APPOINTMENTS */}
      {recentCompletedBookings.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">
                  Convert Recent Client Appointments into Verified Reviews
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Quickly add testimonials received from completed clients on your booking calendar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentCompletedBookings.map((booking) => (
              <div 
                key={booking.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold text-xs text-white truncate max-w-[150px]">
                      {booking.clientName}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                      Completed
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">
                    {booking.serviceName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {booking.date}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddModal({
                    name: booking.clientName,
                    serviceName: booking.serviceName,
                    location: profile.city || 'India',
                    comment: `Exceptional service from the team at ${profile.businessName}! The ${booking.serviceName} was done with utmost care and luxury. Highly recommended!`,
                    rating: 5,
                  })}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add as Review</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testimonial Modal for adding/editing */}
      <TestimonialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        editingTestimonial={editingReview}
        defaultCity={profile.city || 'Indiranagar, Bengaluru'}
        availableServices={services.map(s => s.name)}
      />
    </div>
  );
};
