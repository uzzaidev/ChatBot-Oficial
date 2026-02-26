-- ============================================================
-- DISABLE trigger on_auth_user_created
-- ============================================================
-- O route /api/auth/register cria user_profile manualmente (step 5)
-- O trigger estava causando "Database error creating new user"
-- mesmo com EXCEPTION block, pois o Supabase Auth reverte a
-- transação quando o trigger falha internamente.
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Manter a função caso precise reativar no futuro
-- Para reativar: CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
