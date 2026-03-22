# Roteiro de Preenchimento (10 Minutos)

Objetivo: preencher os campos principais de App Store Connect e TestFlight em 10 minutos, usando texto pronto.

Data de referencia: 2026-03-16

## Antes de comecar (30 segundos)

- Tenha aberto: `https://appstoreconnect.apple.com`
- Tenha aberto: `docs/ios/APP_STORE_CONNECT_COPY.md`
- Use sempre a secao: `BLOCO COPIAR E COLAR (por campo)`
- Para o slot iPhone 6.5", use capturas em `1284x2778` ou `1242x2688`

## Minuto a minuto

### Min 0-1: Abrir tela certa

1. Acesse `App Store Connect > My Apps > UzzApp`.
2. Abra a versao que sera enviada (ou crie nova versao).

### Min 1-4: App Store Information

Preencha os campos abaixo copiando do bloco oficial:

1. `Name`
2. `Subtitle`
3. `Category`
4. `Keywords`
5. `Support URL`
6. `Marketing URL` (opcional)
7. `Privacy Policy URL`
8. `Description`

Arquivo fonte:
- `docs/ios/APP_STORE_CONNECT_COPY.md`

### Min 4-6: TestFlight Information

Em `TestFlight`, preencher:

1. `What to Test`
2. `Beta App Description`
3. `Privacy Policy URL`
4. `Sign-In Required`
5. `Demo Account` (email/senha de review)

Arquivo fonte:
- `docs/ios/APP_STORE_CONNECT_COPY.md`

### Min 6-8: App Review Information

Preencher:

1. `Sign-in required: YES`
2. Credenciais da conta demo
3. Contact info do responsavel
4. `Notes for Reviewer`

Arquivo fonte:
- `App Review Notes`
- `App Review Credentials`
  em `docs/ios/APP_STORE_CONNECT_COPY.md`

### Min 8-10: Revisao rapida e salvar

Checklist final:

1. URLs corretas:
   - `https://uzzapp.uzzai.com.br/privacy`
   - `https://uzzapp.uzzai.com.br/terms`
   - `https://uzzapp.uzzai.com.br/support`
2. Keywords sem exceder limite.
3. Description sem placeholder.
4. Notes do reviewer preenchidas.
5. Salvar todas as secoes.

## Comandos uteis (Windows)

```bash
# Validar URLs publicas
pnpm run ios:validate-urls

# Gerar screenshots rascunho 6.5" (1284x2778)
pnpm run ios:screenshots:draft

# Se aparecer exigencia de iPad 13", gerar:
IOS_SCREENSHOT_PROFILE=ipad_13 pnpm run ios:screenshots:draft

# Capturas autenticadas (dentro do app), iPad 13":
IOS_SCREENSHOT_PROFILE=ipad_13 DEMO_EMAIL="demo@uzzai.com.br" DEMO_PASSWORD="SUA_SENHA" pnpm run ios:screenshots:auth
```

Saida das screenshots:
- `docs/ios/screenshots/draft-6.5in`
- `docs/ios/screenshots/draft-ipad-13in` (quando usar perfil iPad)
- `docs/ios/screenshots/auth-ipad-13in` (capturas logadas)

## Onde esta o texto oficial

Fonte unica para copiar e colar:
- `docs/ios/APP_STORE_CONNECT_COPY.md`
- Secao: `BLOCO COPIAR E COLAR (por campo)`
