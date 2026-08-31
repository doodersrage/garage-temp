-- Preserve existing referral state across the user_metadata -> app_metadata
-- move made in this same release: referred_by and referral_reward_days were
-- being read out of user_metadata, which an end user can freely rewrite via
-- Supabase's own client-side auth.updateUser() call using nothing but their
-- own session and the public anon key -- entirely bypassing this app's
-- server -- letting anyone grant themselves extra Pro trial days (up to the
-- app's own 14 + 7 + 28 day cap) for free. The app now reads/writes both
-- fields from app_metadata instead, which can only be set via the
-- service-role admin API.
--
-- Copy any existing values across so a user who was honestly referred, or a
-- referrer who's honestly earned reward days, doesn't silently lose that
-- state on deploy. (This can't distinguish an honestly-earned value from
-- one set via the now-closed loophole, but simply carries forward whatever
-- trust level already existed rather than making anyone worse off; any
-- individual value was already capped by referralRewardTrialDays() at 28
-- days regardless of source.)

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_strip_nulls(jsonb_build_object(
       'referred_by', raw_user_meta_data -> 'referred_by',
       'referral_reward_days', raw_user_meta_data -> 'referral_reward_days'
     ))
where raw_user_meta_data ? 'referred_by'
   or raw_user_meta_data ? 'referral_reward_days';
