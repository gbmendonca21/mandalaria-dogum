-- Mantém as categorias da loja sem depender de registros de demonstração.
WITH desired (name, slug, sort_order, legacy_name) AS (
  VALUES
    ('Mandalas', 'mandalas', 0, 'Mandalas'),
    ('Porta-chaves', 'porta-chaves', 1, 'Porta-chaves'),
    ('Incensários', 'incensarios', 2, 'Incensários'),
    ('Velas aromáticas', 'velas-aromaticas', 3, 'Velas artesanais aromáticas')
)
INSERT INTO public.categories (name, slug, sort_order, active)
SELECT d.name, d.slug, d.sort_order, true FROM desired d
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.slug=d.slug OR lower(c.name) IN (lower(d.name), lower(d.legacy_name))
)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.categories
SET name=CASE WHEN name='Velas artesanais aromáticas' THEN 'Velas aromáticas' ELSE name END,
    sort_order=CASE name WHEN 'Mandalas' THEN 0 WHEN 'Porta-chaves' THEN 1
      WHEN 'Incensários' THEN 2 WHEN 'Velas aromáticas' THEN 3
      WHEN 'Velas artesanais aromáticas' THEN 3 END,
    updated_at=now()
WHERE name IN ('Mandalas','Porta-chaves','Incensários','Velas aromáticas','Velas artesanais aromáticas');
