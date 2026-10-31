export interface InkBookingRow {
  id: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  tattoo_concept?: string;
  placement?: string;
  artist_id?: string;
  preferred_date?: string;
  preferred_time?: string;
  reference_image_url?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}
