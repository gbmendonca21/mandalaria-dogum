-- A dispensa de verificação é vinculada à conta já autorizada, não apenas
-- ao texto do e-mail. Uma nova conta não herda a dispensa após exclusão.
ALTER TABLE public.admin_memberships
  ADD COLUMN IF NOT EXISTS verification_user_id text;
