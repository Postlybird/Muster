-- Restoration needs no ticket unless the job is specialised, so posting
-- restoration work starts with no tickets ticked; businesses tick what each
-- job needs (owner, 16/11/2026). Construction work keeps its White Card.
delete from public.category_credentials cc
using public.categories c
where cc.category_id = c.id
  and c.code in ('restoration_labourer', 'restoration_technician');
