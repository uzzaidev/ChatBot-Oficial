-- ============================================================
-- Função para verificar se email já existe em auth.users
-- ============================================================
-- Necessário porque listUsers() só retorna 50 por página e
-- não consegue buscar por email diretamente.
-- SECURITY DEFINER: acessa auth schema com permissões elevadas
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(email) = LOWER(p_email)
  );
END;
$$;

-- Apenas service_role pode chamar (API layer garante isso)
REVOKE EXECUTE ON FUNCTION public.check_email_exists(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_email_exists(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO service_role;
