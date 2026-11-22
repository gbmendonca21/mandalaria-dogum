-- Transfere os textos dos antigos cartões fixos para o cadastro editável.
-- Aplicar uma vez; preserva as descrições já cadastradas pela loja.
UPDATE public.categories
SET description = CASE name
    WHEN 'Mandalas' THEN 'Nossa essência'
    WHEN 'Porta-chaves' THEN 'Para o lar'
    WHEN 'Incensários' THEN 'Seu ritual'
    WHEN 'Velas aromáticas' THEN 'Seu ritual'
  END,
  updated_at = now()
WHERE name IN ('Mandalas', 'Porta-chaves', 'Incensários', 'Velas aromáticas')
  AND COALESCE(description, '') = '';
