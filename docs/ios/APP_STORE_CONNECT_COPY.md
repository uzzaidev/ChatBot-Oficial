# App Store Connect - Texto Pronto (UzzApp)

Ultima atualizacao: 2026-03-16

## URLs Oficiais

- App: `https://uzzapp.uzzai.com.br`
- Privacy Policy: `https://uzzapp.uzzai.com.br/privacy`
- Terms: `https://uzzapp.uzzai.com.br/terms`
- Support URL: `https://uzzapp.uzzai.com.br/support`
- Marketing URL (opcional): `https://uzzapp.uzzai.com.br`

Validacao automatica local:
- `pnpm run ios:validate-urls`

## Informacoes do App

- Name: `UzzApp`
- Subtitle (sugestao): `Atendimento WhatsApp com IA`
- Category: `Business`
- Price: `Free`
- Primary Language: `Portuguese (Brazil)`
- SKU: `uzzapp-ios`
- Bundle ID: `com.uzzai.uzzapp`

## BLOCO COPIAR E COLAR (por campo)

Use esta secao para preencher os campos no App Store Connect e TestFlight.

### Name
`UzzApp`

### Subtitle
`Atendimento WhatsApp com IA`

### Category
`Business`

### Keywords
`whatsapp,chatbot,atendimento,crm,automacao,ia,vendas,suporte`

### Support URL
`https://uzzapp.uzzai.com.br/support`

### Marketing URL (opcional)
`https://uzzapp.uzzai.com.br`

### Privacy Policy URL
`https://uzzapp.uzzai.com.br/privacy`

### Description
```text
UzzApp e uma plataforma de atendimento e automacao para WhatsApp focada em operacao comercial e suporte.

Com o app, sua equipe acompanha conversas, organiza contatos, usa IA para acelerar respostas e monitora o atendimento em um unico painel.

Principais recursos:
- Gestao de conversas e contatos em tempo real
- Fluxos de atendimento com IA
- Biometria no app nativo para acesso rapido
- Notificacoes push para eventos importantes
- Dashboard com visao operacional
- Politica de privacidade e termos publicos

Ideal para empresas que precisam escalar atendimento no WhatsApp com padrao, velocidade e rastreabilidade.
```

### TestFlight - What to Test
```text
Nova build iOS do UzzApp com configuracao nativa atualizada, push notifications e fluxo de autenticacao pronto para validacao operacional.

Validar:
- Login com conta de teste
- Navegacao principal no dashboard
- Notificacoes push (recebimento e abertura)
- Acesso por biometria
```

### TestFlight - Beta App Description
```text
Build para validacao interna e externa do app iOS do UzzApp. Esta versao inclui configuracoes finais de plataforma, fluxo de autenticacao e suporte a notificacoes push para testes de ponta a ponta.
```

### App Review Notes
```text
Use a conta demo para acessar o ambiente.

Fluxo recomendado:
1. Fazer login com conta demo.
2. Abrir dashboard e navegar pelos modulos principais.
3. Validar que o app utiliza recursos nativos (push e biometria).

Observacao sobre login social:
- No app nativo iOS, botoes OAuth sociais nao sao exibidos (Capacitor.isNativePlatform()).
- O fluxo principal no iOS e autenticacao por email/senha + biometria.
```

### App Review Credentials
- Sign-in required: `YES`
- Demo account username: `demo@uzzai.com.br`
- Demo account password: `Google1@`
- Contact email: `pedro.pagliarin@uzzai.com.br`
- Contact phone: `+5554991590379`
- Contact name: `Pedro Pagliarin`

## Observacao

Para evitar divergencia, use apenas os textos da secao:
- `BLOCO COPIAR E COLAR (por campo)`

## App Privacy - Respostas Base (para questionario)

Base inicial para preenchimento no App Store Connect (ajustar conforme revisao juridica final):

- Data Types Collected:
  - Contact Info
  - Identifiers
  - Usage Data
- Purposes:
  - App Functionality
  - Account Management
  - Analytics
- Linked to User: `Yes`
- Tracking: `No`

## Checklist Rapido Antes de Submeter

- Privacy URL abrindo com sucesso
- Support URL abrindo com sucesso
- Conta demo funcional
- Campos de contato do reviewer preenchidos
- Screenshots carregadas

Comandos uteis:
- Validar URLs: `pnpm run ios:validate-urls`
- Gerar screenshots rascunho 6.5": `pnpm run ios:screenshots:draft`
- Opcional 6.7": `IOS_SCREENSHOT_PROFILE=6_7 pnpm run ios:screenshots:draft`
- iPad 13" (se App Store pedir): `IOS_SCREENSHOT_PROFILE=ipad_13 pnpm run ios:screenshots:draft`
- iPad 13" logado (dentro do app): `IOS_SCREENSHOT_PROFILE=ipad_13 DEMO_EMAIL="demo@uzzai.com.br" DEMO_PASSWORD="SUA_SENHA" pnpm run ios:screenshots:auth`
