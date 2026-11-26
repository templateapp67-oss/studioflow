-- Cover foreign keys used by booking, notification, profile and loyalty reads.
create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_in_app_notifications_owner_id on public.in_app_notifications(owner_id);
create index if not exists idx_loyalty_redeemed_rewards_reward_id on public.loyalty_redeemed_rewards(reward_id);
create index if not exists idx_profiles_user_id on public.profiles(user_id);
