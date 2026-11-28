/** A public availability row. Unavailable rows may have no allocated specialist. */
export type BookingSlot = {
  time: string;
  label: string;
  available: boolean;
  stylistId: string | null;
  branchId?: string;
  branchName?: string;
  status?: string;
};

/**
 * Ignore malformed RPC rows instead of rendering selectable, nonsensical times.
 * The RPC remains authoritative; this only protects the customer-facing UI.
 */
export function parseBookingSlots(rows: unknown[]): BookingSlot[] {
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return rows.flatMap((value): BookingSlot[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    if (typeof row.time !== 'string' || !validTime.test(row.time) || typeof row.available !== 'boolean') return [];
    const stylistId = typeof row.stylistId === 'string' && row.stylistId.trim() ? row.stylistId : null;
    if (row.available && !stylistId) return [];
    return [{
      time: row.time,
      label: typeof row.label === 'string' && row.label.trim() ? row.label : row.time,
      available: row.available,
      stylistId,
      ...(typeof row.branchId === 'string' ? {branchId: row.branchId} : {}),
      ...(typeof row.branchName === 'string' ? {branchName: row.branchName} : {}),
      ...(typeof row.status === 'string' ? {status: row.status} : {}),
    }];
  });
}
