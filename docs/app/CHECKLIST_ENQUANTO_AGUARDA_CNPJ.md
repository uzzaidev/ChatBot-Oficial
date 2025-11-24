# ✅ Checklist: O que adiantar enquanto aguarda CNPJ

## 🎯 Objetivo
Preparar tudo que for possível ANTES do CNPJ sair, para publicar rapidamente quando estiver pronto.

---

## 📸 1. Screenshots do App (30-45 min)

### O que fazer:
Capturar screenshots profissionais do app em diferentes telas.

### Requisitos:
- **Resolução:** 1080 x 1920 px (9:16)
- **Formato:** PNG ou JPEG
- **Quantidade:** Mínimo 2, máximo 8 (recomendado: 5-6)
- **Tamanho máximo:** 8 MB por imagem

### Telas sugeridas para capturar:
1. ✅ **Tela de Login** (com botão de biometria visível)
2. ✅ **Dashboard** (lista de conversas)
3. ✅ **Tela de Chat** (conversa aberta com mensagens)
4. ✅ **Menu/Configurações** (se houver)
5. ✅ **Notificações** (se houver tela específica)
6. ✅ **Tela de Perfil** (se houver)

### Como capturar:

**No Emulador Android:**
- Pressione `Ctrl + S` ou clique no botão de screenshot
- Ou use: `adb shell screencap -p /sdcard/screenshot.png`
- Depois: `adb pull /sdcard/screenshot.png screenshots/`

**No Device Físico:**
- Pressione botões: **Volume Down + Power** simultaneamente
- Screenshots ficam na galeria

**Script para facilitar:**
```powershell
# Criar pasta para screenshots
mkdir screenshots

# Capturar screenshot via ADB
adb shell screencap -p /sdcard/screenshot_$(date +%Y%m%d_%H%M%S).png
adb pull /sdcard/screenshot_*.png screenshots/
```

### Onde salvar:
```
screenshots/
  ├── 01-login.png
  ├── 02-dashboard.png
  ├── 03-chat.png
  ├── 04-menu.png
  └── 05-notificacoes.png
```

---

## 📝 2. Textos para Play Store (20-30 min)

### 2.1. Nome do App
```
UzzApp - Chatbot Empresarial com IA
```

### 2.2. Descrição Curta (80 caracteres)
```
Chatbot empresarial com IA para WhatsApp Business. Automatize atendimento e venda.
```

### 2.3. Descrição Completa
Já está pronta em `docs/app/GOOGLE_PLAY_STORE_GUIA.md` (linha ~100)

**Copiar de lá ou revisar se necessário.**

### 2.4. Notas de Versão (v1.0.0)
```
🎉 Primeira versão do UzzApp!

✨ Funcionalidades:
• Chatbot com IA integrado ao WhatsApp Business
• Gestão completa de conversas
• Notificações push em tempo real
• Autenticação biométrica (FaceID/TouchID)
• Interface mobile otimizada
• Deep linking para acesso direto

🔒 Segurança:
• Login seguro com Supabase
• Dados protegidos e criptografados
• Conformidade com LGPD

Desenvolvido pela Uzz.AI
```

### 2.5. Palavras-chave (para SEO interno)
- chatbot
- whatsapp business
- inteligência artificial
- atendimento automatizado
- chatbot empresarial
- ia
- automação
- vendas

---

## 🧪 3. Testes Finais do App (1-2 horas)

### 3.1. Testar em Diferentes Devices
- [ ] Emulador Android (já testado)
- [ ] Device físico Android (se possível)
- [ ] Diferentes tamanhos de tela (se possível)

### 3.2. Testar Funcionalidades Principais
- [ ] Login com email/senha
- [ ] Login com biometria (se device tiver)
- [ ] Listar conversas
- [ ] Abrir conversa
- [ ] Enviar mensagem
- [ ] Receber notificação push
- [ ] Deep linking (se configurado)
- [ ] Logout

### 3.3. Testar Casos de Erro
- [ ] Login com credenciais inválidas
- [ ] Sem conexão de internet
- [ ] Sessão expirada
- [ ] App em background/foreground

### 3.4. Verificar Performance
- [ ] App abre rápido (< 3 segundos)
- [ ] Navegação fluida
- [ ] Sem travamentos
- [ ] Sem vazamentos de memória

### 3.5. Verificar UI/UX
- [ ] Textos legíveis
- [ ] Botões com tamanho adequado
- [ ] Cores consistentes
- [ ] Ícones claros
- [ ] Mensagens de erro amigáveis

---

## 🔍 4. Verificar/Obter D-U-N-S (30 min - pode começar)

### 4.1. Verificar se já existe
- [ ] Acessar: https://www.dnb.com/duns-number/lookup.html
- [ ] Buscar por "Uzz.AI" ou nome da empresa
- [ ] Verificar se já tem número D-U-N-S

### 4.2. Se não tiver, iniciar processo
- [ ] Acessar: https://www.dnb.com/duns-number.html
- [ ] Coletar todos os dados necessários:
  - Nome da empresa
  - Endereço completo
  - Telefone
  - E-mail corporativo
  - Site
  - Tipo de negócio
  - Setor/indústria
  - Número de funcionários (aproximado)
  - Data de fundação
- [ ] Preencher formulário (pode fazer mesmo sem CNPJ)
- [ ] Aguardar aprovação (1-5 dias úteis)

**Nota:** Com CNPJ, aprovação é mais rápida, mas pode começar o processo.

---

## 🎨 5. Imagem de Destaque (Opcional - 15 min)

### O que é:
Imagem promocional que aparece na página do app na Play Store.

### Requisitos:
- **Resolução:** 1024 x 500 px
- **Formato:** PNG ou JPEG
- **Tamanho máximo:** 1 MB

### Conteúdo sugerido:
- Logo da Uzz.AI
- Texto: "UzzApp - Chatbot Empresarial com IA"
- Cores da marca (mint/erie-black)
- Design limpo e profissional

### Ferramentas:
- Canva (gratuito)
- Figma (gratuito)
- Photoshop
- GIMP (gratuito)

---

## 📋 6. Checklist de Conteúdo

### Informações da Empresa (já temos)
- [x] Nome: Uzz.AI
- [x] Site: https://www.uzzai.com.br
- [x] E-mail: contato@uzzai.com.br
- [x] Política de Privacidade: https://uzzapp.uzzai.com.br/privacy
- [x] Termos de Serviço: https://uzzapp.uzzai.com.br/terms

### Informações do App (preparar)
- [ ] Screenshots (mínimo 2)
- [ ] Descrição completa revisada
- [ ] Notas de versão escritas
- [ ] Imagem de destaque (opcional)

---

## 🛠️ 7. Preparação Técnica

### 7.1. Verificar AAB
- [x] AAB gerado: `android/app/build/outputs/bundle/release/app-release.aab`
- [x] Tamanho: 7.48 MB (OK)
- [ ] Testar instalação do AAB em device (opcional)

### 7.2. Verificar Versão
- [ ] Versão atual: `1.0.0` (verificar em `android/app/build.gradle`)
- [ ] Version code: `1` (verificar em `android/app/build.gradle`)

### 7.3. Verificar Permissões
- [ ] Verificar se todas as permissões estão justificadas
- [ ] Verificar se não há permissões desnecessárias

---

## 📱 8. Preparação de Marketing (Opcional)

### 8.1. Posts para Redes Sociais
- [ ] Post de anúncio do lançamento
- [ ] Post explicando funcionalidades
- [ ] Post com link para Play Store (quando publicar)

### 8.2. Landing Page (se necessário)
- [ ] Verificar se site tem página do app
- [ ] Criar página de download (se necessário)

### 8.3. Material de Divulgação
- [ ] Banner para redes sociais
- [ ] Imagem de capa (se usar)
- [ ] Texto de apresentação

---

## ⏱️ Tempo Estimado Total

- Screenshots: 30-45 min
- Textos: 20-30 min
- Testes: 1-2 horas
- D-U-N-S: 30 min (iniciar processo)
- Imagem de destaque: 15 min (opcional)
- Marketing: 30-60 min (opcional)

**Total:** ~3-4 horas de trabalho

---

## ✅ Prioridades

### Alta Prioridade (fazer primeiro):
1. ✅ Screenshots (obrigatório)
2. ✅ Revisar textos (obrigatório)
3. ✅ Testes finais (importante)

### Média Prioridade:
4. ⚠️ Iniciar processo D-U-N-S
5. ⚠️ Verificar versão do app

### Baixa Prioridade (opcional):
6. ⚠️ Imagem de destaque
7. ⚠️ Material de marketing

---

## 🎯 Quando CNPJ sair

1. ✅ Obter D-U-N-S (se ainda não tiver)
2. ✅ Criar conta Play Console como Organização
3. ✅ Upload do AAB
4. ✅ Preencher ficha da loja (textos já prontos)
5. ✅ Upload dos screenshots
6. ✅ Enviar para revisão

**Tempo estimado após CNPJ:** 1-2 horas (tudo já preparado!)

---

## 📝 Notas

- Todos os textos já estão prontos em `docs/app/GOOGLE_PLAY_STORE_GUIA.md`
- Screenshots podem ser capturados agora mesmo
- Testes podem ser feitos em paralelo
- D-U-N-S pode ser iniciado mesmo sem CNPJ

**Objetivo:** Quando CNPJ sair, publicar em 1-2 horas! 🚀

