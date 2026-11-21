-- Verificação obrigatória por padrão. Exceções exigem autorização explícita
-- em uma associação de proprietário; esta migração não concede exceções.
ALTER TABLE public.admin_memberships
  ADD COLUMN IF NOT EXISTS email_verification_required boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_memberships_verification_policy_valid'
      AND conrelid = 'public.admin_memberships'::regclass
  ) THEN
    ALTER TABLE public.admin_memberships
      ADD CONSTRAINT admin_memberships_verification_policy_valid
      CHECK (email_verification_required OR role = 'owner');
  END IF;
END $$;
