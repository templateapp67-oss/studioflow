import { useState, useCallback } from 'react';

export function useInkSite(siteSlug?: string) {
  return {
    data: null as any,
    siteData: null,
    loading: false
  };
}

export function useInkAvailability(siteId?: string, artistId?: string, date?: string, duration?: number, branchId?: string) {
  return {
    data: [] as Array<{ start_time: string; end_time: string }>,
    availableSlots: ['11:00 AM', '02:00 PM', '05:00 PM', '07:30 PM'],
    loading: false,
    error: null as string | null
  };
}

export function useInkEnquiry() {
  const submitEnquiry = useCallback(async (data: any) => {
    return { success: true };
  }, []);

  return { submitEnquiry, loading: false };
}

export function useCreateInkBooking() {
  const createBooking = useCallback(async (bookingData: any) => {
    return { id: `ink-bk-${Date.now()}`, ...bookingData };
  }, []);

  return { createBooking, loading: false };
}
