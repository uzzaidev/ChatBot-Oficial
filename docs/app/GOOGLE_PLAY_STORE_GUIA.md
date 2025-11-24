# 🚀 Guia Completo: Publicar UzzApp na Google Play Store

## 📋 Pré-requisitos

- [x] ✅ Keystore gerado (`android/app/release.keystore`)
- [x] ✅ AAB gerado (`android/app/build/outputs/bundle/release/app-release.aab`)
- [x] ✅ Política de Privacidade criada (`https://uzzapp.uzzai.com.br/privacy`)
- [x] ✅ Termos de Serviço criados (`https://uzzapp.uzzai.com.br/terms`)
- [ ] ⏳ Conta Google Play Console (criar agora)
- [ ] ⏳ Screenshots do app (capturar)
- [ ] ⏳ Descrição do app (escrever)

---

## 🎯 Passo 1: Criar Conta Google Play Console

### 1.1. Acessar Play Console
- URL: https://play.google.com/console
- Fazer login com conta Google da empresa (recomendado: contato@uzzai.com.br)

### 1.2. Criar Conta de Desenvolvedor
- Custo: **$25 USD (taxa única, válida para sempre)**
- Método de pagamento: Cartão de crédito/débito
- Tempo: ~2 horas para aprovação

**Informações necessárias:**
- Nome da conta: **Uzz.AI** ou **UzzApp**
- País: **Brasil**
- Tipo de conta: **Individual** ou **Organização**

#### ⚠️ IMPORTANTE: D-U-N-S Number

**Se você escolheu "Organização":**
- O Google pedirá um **número D-U-N-S** (Dun & Bradstreet Number)
- É um número de 9 dígitos que identifica sua empresa
- **Gratuito** para obter, mas pode levar alguns dias

**O que é D-U-N-S?**
- Número de identificação de negócios internacional
- Mantido pela Dun & Bradstreet (empresa de dados comerciais)
- Usado para verificar legitimidade de empresas

**Como obter D-U-N-S (se não tiver):**
1. Acesse: https://www.dnb.com/duns-number.html
2. Preencha formulário com dados da empresa
3. Aguarde aprovação (pode levar 1-5 dias úteis)
4. Receberá o número por e-mail

**Alternativa: Criar como "Individual"**
- Se não tiver D-U-N-S ou quiser agilizar:
- Escolha **"Individual"** em vez de "Organização"
- Não precisa de D-U-N-S
- Pode publicar apps normalmente
- **Desvantagem:** Nome aparece como pessoa física, não empresa

**Recomendação:**
- Se a empresa **já tem D-U-N-S:** Use "Organização" e digite o número
- Se **não tem D-U-N-S:** 
  - **Opção 1:** Solicitar D-U-N-S (gratuito, mas demora alguns dias)
  - **Opção 2:** Criar como "Individual" para publicar mais rápido

**Dados da empresa (se usar Organização):**
- Nome: **Uzz.AI**
- Endereço completo
- Telefone
- Site: **https://www.uzzai.com.br**
- **D-U-N-S Number:** (9 dígitos, se tiver)

### 1.3. Aceitar Contrato de Desenvolvedor
- Ler e aceitar os termos
- Confirmar pagamento

---

## 🎯 Passo 2: Criar Novo App

### 2.1. Iniciar Criação
1. No Play Console, clique em **"Criar app"**
2. Preencha as informações:

**Nome do app:**
```
UzzApp
```

**Idioma padrão:**
```
Português (Brasil)
```

**Tipo de app:**
```
App
```

**Gratuito ou pago:**
```
Gratuito
```

**Declarações:**
- ✅ Declaro que tenho os direitos de distribuir este app
- ✅ Este app cumpre todas as políticas do Google Play

### 2.2. Configurações do App
- **Nome do pacote:** `com.chatbot.app` (já configurado no projeto)
- **ID do app:** Será gerado automaticamente ou você pode escolher

---

## 🎯 Passo 3: Preencher Ficha da Loja

### 3.1. Informações do App

**Nome do app (título):**
```
UzzApp - Chatbot Empresarial com IA
```

**Descrição curta (80 caracteres):**
```
Chatbot empresarial com IA para WhatsApp Business. Automatize atendimento e venda.
```

**Descrição completa:**
```
UzzApp é o chatbot empresarial com inteligência artificial da Uzz.AI, projetado para automatizar e otimizar a comunicação empresarial através do WhatsApp Business API.

🎯 PRINCIPAIS FUNCIONALIDADES:

🤖 Chatbot Inteligente
• Respostas automáticas com IA (OpenAI, Groq)
• Integração nativa com WhatsApp Business API
• Gestão completa de conversas e atendimentos

💬 Gestão de Conversas
• Interface intuitiva para gerenciar múltiplas conversas
• Histórico completo de mensagens
• Suporte a texto, áudio, imagens e documentos

🔔 Notificações Push
• Receba notificações em tempo real de novas mensagens
• Nunca perca uma conversa importante

🔐 Segurança
• Autenticação biométrica (FaceID/TouchID)
• Login seguro com Supabase
• Dados protegidos e criptografados

📱 Experiência Mobile
• App nativo para Android
• Interface otimizada para mobile
• Deep linking para acesso direto a conversas

🚀 IDEAL PARA:
• Empresas que querem automatizar atendimento
• E-commerces que precisam de suporte 24/7
• Negócios que buscam escalar vendas
• Empresas que querem melhorar experiência do cliente

Desenvolvido pela Uzz.AI - Transformando comunicação empresarial com inteligência artificial.

Visite: https://www.uzzai.com.br
```

**URL do site:**
```
https://uzzapp.uzzai.com.br
```

**E-mail de suporte:**
```
contato@uzzai.com.br
```

### 3.2. Categoria e Classificação

**Categoria:**
```
Negócios
```

**Classificação de conteúdo:**
- Responder questionário do Google
- Classificação: **Todos** (ou conforme seu público)

### 3.3. Política de Privacidade

**URL da Política de Privacidade:**
```
https://uzzapp.uzzai.com.br/privacy
```

**URL dos Termos de Serviço:**
```
https://uzzapp.uzzai.com.br/terms
```

---

## 🎯 Passo 4: Upload do AAB

### 4.1. Acessar Produção
1. No menu lateral, vá em **"Produção"** → **"Criar nova versão"**
2. Ou vá em **"Versões"** → **"Produção"** → **"Criar versão"**

### 4.2. Upload do AAB
1. Clique em **"Fazer upload de um arquivo"**
2. Selecione: `android/app/build/outputs/bundle/release/app-release.aab`
3. Aguarde o upload (pode demorar alguns minutos)
4. O Google irá processar e validar o AAB

### 4.3. Informações da Versão

**Nome da versão:**
```
1.0.0
```

**Notas de versão:**
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

---

## 🎯 Passo 5: Screenshots e Assets

### 5.1. Screenshots Obrigatórios

**Android Phone (mínimo 2, máximo 8):**
- Resolução: **1080 x 1920 px** (ou proporção 9:16)
- Formatos aceitos: PNG ou JPEG
- Tamanho máximo: 8 MB por imagem

**Sugestão de screenshots:**
1. Tela de login (com botão de biometria)
2. Dashboard com lista de conversas
3. Tela de chat/conversa aberta
4. Menu de configurações
5. Tela de notificações

**Como capturar:**
- No emulador Android: `Ctrl + S` ou botão de screenshot
- No device físico: Botões de volume + power
- Ou use: `adb shell screencap -p /sdcard/screenshot.png`

### 5.2. Ícone do App
- Já configurado no projeto (gerado automaticamente)
- O Google usa o ícone do AAB

### 5.3. Imagem de Destaque (Opcional)
- Resolução: **1024 x 500 px**
- Formato: PNG ou JPEG
- Tamanho máximo: 1 MB

---

## 🎯 Passo 6: Preencher Informações Adicionais

### 6.1. Contato do Desenvolvedor

**E-mail:**
```
contato@uzzai.com.br
```

**Telefone:**
```
[Seu telefone]
```

**Site:**
```
https://www.uzzai.com.br
```

### 6.2. Classificação de Conteúdo
- Responder questionário completo
- Classificar app conforme funcionalidades

### 6.3. Direitos de Administrador
- Definir quem pode gerenciar o app
- Adicionar membros da equipe (opcional)

---

## 🎯 Passo 7: Revisão e Publicação

### 7.1. Verificar Checklist
Antes de enviar para revisão, verificar:

- [ ] ✅ AAB enviado e processado
- [ ] ✅ Nome do app preenchido
- [ ] ✅ Descrição completa preenchida
- [ ] ✅ Screenshots adicionados (mínimo 2)
- [ ] ✅ Política de Privacidade (URL válida)
- [ ] ✅ Termos de Serviço (URL válida)
- [ ] ✅ E-mail de suporte preenchido
- [ ] ✅ Categoria selecionada
- [ ] ✅ Classificação de conteúdo preenchida
- [ ] ✅ Notas de versão preenchidas

### 7.2. Enviar para Revisão
1. Clique em **"Revisar versão"**
2. Revise todas as informações
3. Clique em **"Iniciar publicação para produção"**
4. Confirme o envio

### 7.3. Tempo de Revisão
- **Primeira publicação:** 1-3 dias úteis
- **Atualizações:** Geralmente 1-7 dias úteis
- Você receberá e-mail quando for aprovado ou se houver problemas

---

## 📝 Checklist Final

### Antes de Publicar:
- [ ] ✅ Keystore com backup seguro
- [ ] ✅ AAB gerado e testado
- [ ] ✅ Conta Play Console criada e paga
- [ ] ✅ App criado no console
- [ ] ✅ Ficha da loja preenchida
- [ ] ✅ Screenshots capturados e enviados
- [ ] ✅ Política de Privacidade publicada e acessível
- [ ] ✅ Termos de Serviço publicados e acessíveis
- [ ] ✅ Descrição do app escrita
- [ ] ✅ Notas de versão escritas
- [ ] ✅ Todas as informações revisadas

### Após Publicação:
- [ ] ✅ Monitorar reviews e avaliações
- [ ] ✅ Responder comentários dos usuários
- [ ] ✅ Monitorar crash reports
- [ ] ✅ Planejar atualizações futuras

---

## 🔗 Links Úteis

- **Play Console:** https://play.google.com/console
- **Política de Privacidade:** https://uzzapp.uzzai.com.br/privacy
- **Termos de Serviço:** https://uzzapp.uzzai.com.br/terms
- **Site da Empresa:** https://www.uzzai.com.br
- **Suporte:** contato@uzzai.com.br

---

## ⚠️ Importante

1. **Keystore:** Se perder, não poderá atualizar o app. Faça backup!
2. **Primeira publicação:** Pode levar até 3 dias para aprovação
3. **Atualizações:** Sempre use o mesmo keystore para assinar
4. **Testes:** Teste o AAB antes de publicar (usar Google Play Internal Testing)

---

## 🆘 Problemas Comuns

### AAB rejeitado
- Verificar se está usando keystore correto
- Verificar se versão code é maior que anterior
- Verificar se package name está correto

### App rejeitado na revisão
- Ler feedback do Google
- Corrigir problemas apontados
- Reenviar para revisão

### Erro ao fazer upload
- Verificar tamanho do arquivo (máx 100 MB)
- Verificar conexão de internet
- Tentar novamente

---

**Boa sorte com a publicação! 🚀**

