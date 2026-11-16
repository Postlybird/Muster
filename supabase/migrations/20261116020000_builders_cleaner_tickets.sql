-- Posting builders cleaning starts with no tickets ticked too, like
-- restoration; the business ticks what each job needs (owner, 16/11/2026).
-- General labourers keep their White Card.
delete from public.category_credentials cc
using public.categories c
where cc.category_id = c.id
  and c.code = 'builders_cleaner';
