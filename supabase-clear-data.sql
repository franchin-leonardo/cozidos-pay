-- Limpeza de dados para reiniciar a importacao de PIX
-- Execute no SQL Editor do Supabase

begin;

-- Primeiro remove vinculos para evitar conflito de FK
delete from movement_allocations;

-- Depois remove registros principais
delete from movements;
delete from expenses;

commit;

-- Conferencia rapida
select 'movement_allocations' as table_name, count(*) as total from movement_allocations
union all
select 'movements' as table_name, count(*) as total from movements
union all
select 'expenses' as table_name, count(*) as total from expenses;
