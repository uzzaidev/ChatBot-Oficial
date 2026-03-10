# ACORDO DE PROCESSAMENTO DE DADOS PESSOAIS (DPA)
## Anexo à Política de Privacidade e aos Termos e Condições de Uso

**Versão:** 1.0
**Última atualização:** 10 de março de 2026
**URL pública:** https://uzzapp.uzzai.com.br/docs/dpa
**Vigência:** Incorporado automaticamente ao contrato de serviços no ato da criação da conta.

---

## IDENTIFICAÇÃO DAS PARTES

**OPERADORA:**
UZZ.AI TECNOLOGIA LTDA.
CNPJ/MF: 64.025.866/0001-30
Sede: Av. Júlio de Castilhos, 1989 - Centro, Caxias do Sul — RS, CEP 95013-215
E-mail de privacidade: privacidade@uzzai.com.br
DPO: Pedro Vitor Brunello Pagliarin — dpo@uzzai.com.br

**CONTROLADORA:**
Pessoa jurídica que realiza o cadastro e contratação dos serviços na Plataforma ("CLIENTE"), devidamente identificada no momento da adesão.

---

## PREÂMBULO

Este Acordo de Processamento de Dados Pessoais ("DPA") integra e complementa os Termos e Condições de Uso da Plataforma UZZ.AI, disponíveis em https://uzzapp.uzzai.com.br/terms, e a Política de Privacidade, disponível em https://uzzapp.uzzai.com.br/privacy.

O presente DPA foi elaborado em conformidade com a Lei nº 13.709/2018 (LGPD), especialmente seus Arts. 37 a 40, que tratam da responsabilidade de Controladores e Operadores no tratamento de dados pessoais.

**A aceitação dos Termos e Condições de Uso no ato do cadastro implica aceitação integral deste DPA**, sem necessidade de assinatura adicional, conforme o modelo de contratação SaaS via aceite eletrônico (Art. 7º, CC; Art. 8º, Marco Civil da Internet).

---

## 1. DEFINIÇÕES

Para fins deste DPA, aplicam-se as definições da LGPD (Lei nº 13.709/2018):

- **Dados Pessoais:** Qualquer informação relacionada à pessoa natural identificada ou identificável inserida pelo CLIENTE na Plataforma, incluindo nomes, números de telefone, históricos de conversas e demais dados dos usuários finais do CLIENTE.
- **Tratamento:** Toda operação realizada com Dados Pessoais, incluindo coleta, armazenamento, processamento, transmissão e exclusão.
- **Controlador:** O CLIENTE — quem define as finalidades e os meios de tratamento dos Dados Pessoais de seus usuários finais.
- **Operador:** A UZZ.AI — quem realiza o tratamento em nome do Controlador, conforme suas instruções.
- **Titular:** Pessoa natural a quem os Dados Pessoais se referem (os usuários finais do CLIENTE).
- **ANPD:** Autoridade Nacional de Proteção de Dados.
- **Suboperador:** Terceiro contratado pela UZZ.AI para auxiliar na prestação dos serviços, sujeito às mesmas obrigações deste DPA.
- **Incidente de Segurança:** Acesso não autorizado, destruição, perda, alteração, divulgação ou qualquer forma de tratamento inadequado de Dados Pessoais.

---

## 2. PAPÉIS JURÍDICOS E ESCOPO

**2.1. Controlador.** O CLIENTE é o Controlador dos Dados Pessoais de seus usuários finais, sendo o único responsável por definir as finalidades do tratamento, obter as bases legais adequadas e garantir a conformidade com a LGPD.

**2.2. Operador.** A UZZ.AI é Operadora, tratando os Dados Pessoais exclusivamente conforme as instruções do CLIENTE e para as finalidades contratadas, que compreendem:

- (a) Recebimento, processamento e envio de mensagens via WhatsApp Business API;
- (b) Geração de respostas automatizadas por modelos de linguagem (IA);
- (c) Armazenamento de histórico de conversas e dados cadastrais dos usuários finais;
- (d) Busca semântica na base de conhecimento (RAG);
- (e) Transferência de atendimento para agentes humanos (handoff);
- (f) Geração de relatórios e dashboards de uso.

**2.3. Controladora de Dados Próprios.** A UZZ.AI atua como Controladora dos dados cadastrais e de faturamento do próprio CLIENTE (pessoa jurídica), nos termos da Política de Privacidade.

**2.4. Base Legal do Tratamento pelo Operador.** A UZZ.AI realiza o tratamento com fundamento no Art. 7º, V da LGPD (execução de contrato), processando apenas os dados estritamente necessários para a prestação dos serviços contratados (princípio da necessidade — Art. 6º, III).

---

## 3. OBRIGAÇÕES DA UZZ.AI (OPERADORA)

**3.1. Instrução do Controlador.** A UZZ.AI tratará os Dados Pessoais estritamente conforme as instruções documentadas do CLIENTE, salvo nos casos de cumprimento de obrigação legal ou ordem judicial, hipótese em que notificará o CLIENTE previamente quando legalmente possível.

**3.2. Medidas de Segurança.** A UZZ.AI implementará e manterá medidas técnicas e administrativas de segurança adequadas a proteger os Dados Pessoais, incluindo:

- (a) Criptografia em trânsito (TLS 1.2+) e em repouso (AES-256 via Supabase/pgsodium Vault);
- (b) Controle de acesso baseado em papéis (RBAC) com isolamento multi-tenant (Row Level Security);
- (c) Credenciais de API armazenadas em Vault criptografado (Supabase Vault / pgsodium);
- (d) Logs de acesso mantidos por prazo mínimo de 6 meses (Art. 15, Marco Civil da Internet);
- (e) Backups periódicos automatizados com retenção de 30 dias;
- (f) Infraestrutura hospedada em provedores certificados (Supabase/AWS, Vercel).

**3.3. Confidencialidade do Pessoal.** A UZZ.AI garantirá que os colaboradores e prestadores com acesso a Dados Pessoais estejam sujeitos a obrigações de confidencialidade, inclusive após o término do vínculo.

**3.4. Suboperadores.** O CLIENTE autoriza a UZZ.AI a utilizar os Suboperadores listados na Política de Privacidade (https://uzzapp.uzzai.com.br/privacy), incluindo:

| Suboperador | Papel | Localização |
|---|---|---|
| Supabase (AWS) | Banco de dados e armazenamento | EUA (com SCCs) |
| Vercel | Processamento serverless | EUA (com SCCs) |
| OpenAI | Processamento de linguagem natural | EUA (com SCCs) |
| Groq | Inferência de modelos de linguagem | EUA (com SCCs) |
| Upstash (Redis) | Cache e enfileiramento | EUA (com SCCs) |
| Meta Platforms | API de mensagens WhatsApp | EUA (com SCCs) |

A UZZ.AI contratará os Suboperadores exigindo garantias de proteção de dados equivalentes às deste DPA e notificará o CLIENTE sobre inclusão de novos suboperadores com antecedência mínima de 15 dias, conferindo ao CLIENTE o direito de objeção fundamentada.

**3.5. Assistência ao Controlador.** A UZZ.AI auxiliará o CLIENTE no atendimento a solicitações de Titulares (Art. 18, LGPD) e no cumprimento de obrigações regulatórias, incluindo:

- (a) Responder a solicitações de acesso, correção, portabilidade e exclusão de dados, dentro de seus sistemas, em prazo razoável após solicitação formal;
- (b) Fornecer as informações necessárias para que o CLIENTE possa demonstrar conformidade com a LGPD perante a ANPD;
- (c) Notificar o CLIENTE sobre Incidentes de Segurança conforme Cláusula 5.

**3.6. Transferência Internacional.** Quando Dados Pessoais forem transferidos a Suboperadores localizados fora do Brasil, a UZZ.AI garantirá que tal transferência ocorra com base em mecanismos adequados (Cláusulas Contratuais Padrão — SCCs, adequação regulatória ou consentimento), em conformidade com o Art. 33 da LGPD.

---

## 4. OBRIGAÇÕES DO CLIENTE (CONTROLADOR)

**4.1. Conformidade.** O CLIENTE é o único responsável por garantir que o tratamento de Dados Pessoais realizado por meio da Plataforma esteja em conformidade com a LGPD e demais legislações aplicáveis, incluindo a obtenção e documentação das bases legais adequadas (Art. 7º, LGPD).

**4.2. Opt-in WhatsApp.** O CLIENTE obriga-se a obter opt-in válido e documentado de seus usuários finais antes de iniciar comunicações proativas via WhatsApp Business, em conformidade com as Políticas Comerciais da Meta.

**4.3. Transparência com Titulares.** O CLIENTE obriga-se a informar seus usuários finais, de forma clara e acessível, sobre o uso de automação por inteligência artificial no atendimento, em conformidade com o Art. 6º, VI da LGPD (princípio da transparência).

**4.4. Ponto de Contato com Titulares.** O CLIENTE será o responsável principal pelo atendimento a solicitações de Titulares e por comunicações à ANPD, na qualidade de Controlador.

**4.5. Conteúdo da Base de Conhecimento.** O CLIENTE é exclusivamente responsável pelo conteúdo inserido na base de conhecimento (RAG) da Plataforma, garantindo que não contenha dados pessoais sensíveis (Art. 11, LGPD) sem base legal adequada, nem viole direitos de terceiros.

---

## 5. INCIDENTES DE SEGURANÇA

**5.1. Notificação ao Controlador.** A UZZ.AI notificará o CLIENTE sobre qualquer Incidente de Segurança que possa acarretar risco ou dano relevante aos Titulares, no prazo máximo de **48 (quarenta e oito) horas** após a confirmação do incidente, por meio do e-mail cadastrado pelo CLIENTE.

A notificação conterá, no mínimo:
- (a) Descrição da natureza do incidente e categorias de dados afetados;
- (b) Número aproximado de Titulares afetados;
- (c) Medidas já adotadas ou em curso para mitigação;
- (d) Contato do DPO da UZZ.AI para esclarecimentos adicionais.

**5.2. Responsabilidade do Controlador.** Após receber a notificação, cabe ao CLIENTE:

- (a) Avaliar a necessidade e o prazo para comunicação à ANPD e aos Titulares, conforme Art. 48 da LGPD e Resolução CD/ANPD nº 15/2024;
- (b) Conduzir a comunicação pública e regulatória do incidente, arcando com os custos correspondentes, salvo comprovação de culpa exclusiva da UZZ.AI.

**5.3. Responsabilidade da UZZ.AI.** A UZZ.AI responderá pelos danos causados a Titulares exclusivamente na medida em que o incidente resulte de falha comprovada no cumprimento de suas obrigações como Operadora, nos limites estabelecidos na Cláusula 9 dos Termos e Condições de Uso.

---

## 6. TÉRMINO DO TRATAMENTO E EXCLUSÃO DE DADOS

**6.1. Após o Encerramento do Contrato.** Com o término do contrato, a UZZ.AI:

- (a) Manterá os Dados Pessoais por até **90 (noventa) dias**, prazo durante o qual o CLIENTE poderá solicitar exportação em formato estruturado (JSON/CSV);
- (b) Findo o prazo de 90 dias sem solicitação, os Dados Pessoais serão permanentemente excluídos ou anonimizados, ressalvados os dados cuja retenção seja exigida por lei (logs de acesso — 6 meses; dados fiscais — 5 anos);
- (c) A exclusão lógica (soft delete) será finalizada em exclusão física no prazo de **30 (trinta) dias** após o período de 90 dias;
- (d) A UZZ.AI emitirá, mediante solicitação formal, **certificado de exclusão** no prazo de 15 dias.

**6.2. Dados de Suboperadores.** A UZZ.AI envidará esforços comercialmente razoáveis para garantir que os Suboperadores também excluam os dados do CLIENTE após o encerramento contratual, respeitando os prazos de cada provedor.

---

## 7. AUDITORIA E CONFORMIDADE

**7.1.** A UZZ.AI manterá registros documentados das atividades de tratamento realizadas como Operadora (Art. 37, LGPD), disponíveis para consulta pelo CLIENTE mediante solicitação formal, com prazo de resposta de 15 dias úteis.

**7.2.** A UZZ.AI cooperará com auditorias de conformidade realizadas pelo CLIENTE ou por auditores por ele designados, respeitando os interesses legítimos de confidencialidade da UZZ.AI e de seus demais clientes.

---

## 8. VIGÊNCIA E ATUALIZAÇÃO

**8.1.** Este DPA tem vigência equivalente à do contrato de serviços e é automaticamente renovado por igual período.

**8.2.** A UZZ.AI poderá atualizar este DPA para adequação a alterações legais, regulatórias ou técnicas, notificando o CLIENTE com antecedência mínima de **30 (trinta) dias**. O uso continuado da Plataforma após o prazo notificado implica aceitação das alterações.

---

## CONTATO

**DPO — Encarregado de Proteção de Dados:**
Pedro Vitor Brunello Pagliarin
E-mail: dpo@uzzai.com.br
Telefone: (54) 99159-0379

**Privacidade:**
privacidade@uzzai.com.br

**UZZ.AI TECNOLOGIA LTDA.**
Av. Júlio de Castilhos, 1989 - Centro, Caxias do Sul/RS — CEP 95013-215
CNPJ: 64.025.866/0001-30

---

*© 2026 UZZ.AI TECNOLOGIA LTDA. Todos os direitos reservados.*
