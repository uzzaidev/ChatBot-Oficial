-- ============================================================
-- FIX: handle_new_user trigger com ON CONFLICT DO NOTHING
-- ============================================================
-- Problema: INSERT simples no trigger lança exceção se já
-- existir um user_profile com o mesmo id (tentativas parciais),
-- fazendo o Supabase retornar "Database error creating new user"
-- e revertendo toda a criação do Auth user.
-- Solução: usar ON CONFLICT DO NOTHING para ser idempotente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Limpar órfãos com mesmo email mas id diferente (tentativas anteriores falhas)
  DELETE FROM public.user_profiles
  WHERE email = NEW.email AND id <> NEW.id;

  INSERT INTO public.user_profiles (id, email, role, client_id, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NULLIF(NEW.raw_user_meta_data->>'client_id', '')::UUID,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    client_id = COALESCE(EXCLUDED.client_id, public.user_profiles.client_id),
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca deixar o trigger derrubar a criação do usuário
  RAISE WARNING 'handle_new_user: erro ignorado para user % - %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger (garante que usa a função atualizada)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
