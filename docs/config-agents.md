# Interface de Configuração de Agentes

Este documento descreve a nova interface de configuração de agentes de IA para o chatbot WhatsApp.

## Visão Geral

A página `/dashboard/agents` permite configurar múltiplos agentes de IA com diferentes personalidades, cada um com:

- **Identidade**: Nome, avatar, descrição
- **Tom & Estilo**: Como o agente responde
- **Comportamento**: O que o agente deve fazer
- **Ferramentas**: Skills disponíveis (RAG, handoff, etc.)
- **Modelo IA**: Provider e configurações

## Funcionalidades

### Core

- Cards visuais para cada agente
- Formulários estruturados (não raw prompts)
- Preview/teste em tempo real
- Ativação com um clique

### Extras

- **Templates**: Agentes pré-configurados (Vendas, Suporte, Qualificação, Atendente)
- **Histórico de Versões**: Auto-save com rollback
- **Agendamento**: Troca automática por horário
- **A/B Testing**: Split de tráfego entre 2 agentes

## Arquitetura

```
/dashboard/agents
       │
       ▼
┌────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Agent Cards   │ ──► │  Agent Editor     │ ──► │  Preview Chat    │
│  (Lista)       │     │  (Form Estruturado)│     │  (Simulador)     │
└────────────────┘     └───────────────────┘     └──────────────────┘
       │                       │                         │
       ▼                       ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API Layer (/api/agents/*)                     │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│              Database (agents table + RLS)                       │
└──────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tabela `agents`

| Coluna                 | Tipo    | Descrição                               |
| ---------------------- | ------- | --------------------------------------- |
| id                     | UUID    | Primary key                             |
| client_id              | UUID    | FK para clients                         |
| name                   | TEXT    | Nome do agente                          |
| is_active              | BOOLEAN | Agente ativo                            |
| response_tone          | TEXT    | formal/friendly/professional/casual     |
| response_style         | TEXT    | helpful/direct/educational/consultative |
| enable_rag             | BOOLEAN | Base de conhecimento ativa              |
| temperature            | NUMERIC | 0.0 - 2.0                               |
| compiled_system_prompt | TEXT    | Prompt gerado automaticamente           |

### Tabelas Auxiliares

- `agent_versions` - Histórico de versões
- `agent_schedules` - Regras de agendamento
- `agent_experiments` - Configurações de A/B tests
- `experiment_assignments` - Atribuições sticky por telefone

## API Endpoints

| Método | Endpoint                    | Descrição      |
| ------ | --------------------------- | -------------- |
| GET    | `/api/agents`               | Listar agentes |
| GET    | `/api/agents/[id]`          | Detalhes       |
| POST   | `/api/agents`               | Criar          |
| PATCH  | `/api/agents/[id]`          | Atualizar      |
| DELETE | `/api/agents/[id]`          | Excluir        |
| POST   | `/api/agents/[id]/activate` | Ativar         |
| POST   | `/api/agents/[id]/test`     | Testar         |

## Componentes

```
src/components/agents/
  AgentCard.tsx           # Card na lista
  AgentEditor.tsx         # Formulário principal
  AgentPreviewChat.tsx    # Chat de preview
  TemplateSelector.tsx    # Seletor de templates
  AgentVersionHistory.tsx # Histórico de versões
  AgentScheduler.tsx      # Configuração de horários
  ABTestDashboard.tsx     # Dashboard de experimentos
```

---

## HTML Mock da Interface

Abra este arquivo em um navegador para visualizar o mock interativo.

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agentes - UZZ.AI</title>
    <style>
      /* ===== CSS VARIABLES (Dark/Light Mode) ===== */
      :root {
        --uzz-mint: #1abc9c;
        --uzz-blue: #2e86ab;
        --uzz-gold: #ffd700;

        /* Dark Mode (Default) */
        --bg-page: #0f1419;
        --bg-card: #1a1f26;
        --bg-surface: #242a33;
        --bg-input: #2a323d;
        --text-primary: #f8fafc;
        --text-secondary: #94a3b8;
        --text-muted: #64748b;
        --border-color: rgba(255, 255, 255, 0.1);
        --border-hover: rgba(255, 255, 255, 0.2);
        --shadow: rgba(0, 0, 0, 0.3);
      }

      .light {
        --bg-page: #f8fafc;
        --bg-card: #ffffff;
        --bg-surface: #f1f5f9;
        --bg-input: #e2e8f0;
        --text-primary: #1e293b;
        --text-secondary: #475569;
        --text-muted: #64748b;
        --border-color: rgba(0, 0, 0, 0.1);
        --border-hover: rgba(0, 0, 0, 0.2);
        --shadow: rgba(0, 0, 0, 0.1);
      }

      /* ===== RESET & BASE ===== */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--bg-page);
        color: var(--text-primary);
        min-height: 100vh;
        line-height: 1.5;
      }

      /* ===== LAYOUT ===== */
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        flex-wrap: wrap;
        gap: 16px;
      }

      .header h1 {
        font-size: 28px;
        font-weight: 600;
        background: linear-gradient(135deg, var(--uzz-mint), var(--uzz-blue));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .header p {
        color: var(--text-secondary);
        margin-top: 4px;
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }

      /* ===== BUTTONS ===== */
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        text-decoration: none;
      }

      .btn-primary {
        background: linear-gradient(135deg, var(--uzz-mint), var(--uzz-blue));
        color: white;
      }
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(26, 188, 156, 0.3);
      }

      .btn-secondary {
        background: var(--bg-surface);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }
      .btn-secondary:hover {
        border-color: var(--uzz-mint);
      }

      .btn-ghost {
        background: transparent;
        color: var(--text-secondary);
        padding: 8px;
      }
      .btn-ghost:hover {
        color: var(--uzz-mint);
        background: rgba(26, 188, 156, 0.1);
      }

      .btn-danger {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.2);
      }
      .btn-danger:hover {
        background: rgba(239, 68, 68, 0.2);
      }

      /* ===== TABS ===== */
      .page-tabs {
        display: flex;
        gap: 4px;
        padding: 4px;
        background: var(--bg-surface);
        border-radius: 10px;
        margin-bottom: 24px;
        width: fit-content;
      }

      .page-tab {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        background: transparent;
      }
      .page-tab:hover {
        color: var(--text-primary);
      }
      .page-tab.active {
        background: var(--bg-card);
        color: var(--uzz-mint);
        box-shadow: 0 2px 8px var(--shadow);
      }

      /* ===== AGENT CARDS GRID ===== */
      .agents-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 20px;
      }

      .agent-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        overflow: hidden;
        transition: all 0.3s;
      }
      .agent-card:hover {
        transform: translateY(-4px);
        border-color: var(--border-hover);
        box-shadow: 0 12px 24px var(--shadow);
      }
      .agent-card.active {
        border-color: var(--uzz-mint);
        box-shadow: 0 0 0 1px var(--uzz-mint), 0 12px 24px rgba(26, 188, 156, 0.15);
      }

      .agent-card-header {
        padding: 20px;
        background: linear-gradient(
          135deg,
          rgba(26, 188, 156, 0.05),
          rgba(46, 134, 171, 0.05)
        );
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .agent-avatar {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        background: var(--bg-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        flex-shrink: 0;
      }

      .agent-info {
        flex: 1;
        min-width: 0;
      }

      .agent-info h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .agent-info p {
        font-size: 13px;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .agent-card-body {
        padding: 20px;
      }

      .agent-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }

      .tag {
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
      }
      .tag-mint {
        background: rgba(26, 188, 156, 0.15);
        color: var(--uzz-mint);
      }
      .tag-blue {
        background: rgba(46, 134, 171, 0.15);
        color: var(--uzz-blue);
      }
      .tag-gold {
        background: rgba(255, 215, 0, 0.15);
        color: var(--uzz-gold);
      }

      .agent-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        padding: 12px 0;
        border-top: 1px solid var(--border-color);
        margin-top: 12px;
      }

      .stat {
        text-align: center;
      }
      .stat-value {
        font-size: 18px;
        font-weight: 600;
        color: var(--uzz-mint);
      }
      .stat-label {
        font-size: 11px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .agent-card-footer {
        padding: 16px 20px;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }
      .status-active {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }
      .status-inactive {
        background: var(--bg-surface);
        color: var(--text-muted);
      }

      .card-actions {
        display: flex;
        gap: 4px;
      }

      /* ===== CREATE CARD ===== */
      .create-card {
        background: var(--bg-card);
        border: 2px dashed var(--border-color);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 280px;
        cursor: pointer;
        transition: all 0.3s;
      }
      .create-card:hover {
        border-color: var(--uzz-mint);
        background: rgba(26, 188, 156, 0.05);
      }
      .create-card-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--bg-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        margin-bottom: 16px;
        color: var(--uzz-mint);
      }
      .create-card h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .create-card p {
        font-size: 13px;
        color: var(--text-muted);
      }

      /* ===== EDITOR MODAL ===== */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 100;
      }

      .modal {
        background: var(--bg-card);
        border-radius: 16px;
        width: 100%;
        max-width: 1100px;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border-color);
      }

      .modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-surface);
      }

      .modal-header h2 {
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .modal-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .editor-panel {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }

      .preview-panel {
        width: 380px;
        border-left: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        background: var(--bg-surface);
      }

      /* ===== EDITOR TABS ===== */
      .tabs {
        display: flex;
        gap: 4px;
        padding: 4px;
        background: var(--bg-surface);
        border-radius: 10px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .tab {
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        background: transparent;
        white-space: nowrap;
      }
      .tab:hover {
        color: var(--text-primary);
      }
      .tab.active {
        background: var(--bg-card);
        color: var(--uzz-mint);
        box-shadow: 0 2px 8px var(--shadow);
      }

      /* ===== FORM ELEMENTS ===== */
      .form-group {
        margin-bottom: 20px;
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .form-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--text-primary);
      }

      .form-hint {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 6px;
      }

      .form-input,
      .form-select,
      .form-textarea {
        width: 100%;
        padding: 12px 16px;
        background: var(--bg-input);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 14px;
        color: var(--text-primary);
        transition: all 0.2s;
        font-family: inherit;
      }
      .form-input:focus,
      .form-select:focus,
      .form-textarea:focus {
        outline: none;
        border-color: var(--uzz-mint);
        box-shadow: 0 0 0 3px rgba(26, 188, 156, 0.15);
      }
      .form-input::placeholder,
      .form-textarea::placeholder {
        color: var(--text-muted);
      }

      .form-textarea {
        min-height: 100px;
        resize: vertical;
      }

      .form-select {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 16px center;
        padding-right: 40px;
      }

      /* ===== AVATAR PICKER ===== */
      .avatar-picker {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .avatar-option {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        background: var(--bg-surface);
        border: 2px solid transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .avatar-option:hover {
        border-color: var(--border-hover);
      }
      .avatar-option.selected {
        border-color: var(--uzz-mint);
        background: rgba(26, 188, 156, 0.1);
      }

      /* ===== TOGGLE CARDS ===== */
      .toggle-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .toggle-card {
        padding: 16px;
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .toggle-card:hover {
        border-color: var(--border-hover);
      }
      .toggle-card.active {
        border-color: var(--uzz-mint);
        background: rgba(26, 188, 156, 0.05);
      }

      .toggle-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .toggle-card h4 {
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toggle-card p {
        font-size: 12px;
        color: var(--text-muted);
        line-height: 1.4;
      }

      .toggle-switch {
        width: 44px;
        height: 24px;
        background: var(--bg-input);
        border-radius: 12px;
        position: relative;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .toggle-switch::after {
        content: "";
        position: absolute;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      .toggle-card.active .toggle-switch {
        background: var(--uzz-mint);
      }
      .toggle-card.active .toggle-switch::after {
        left: 22px;
      }

      /* ===== PREVIEW CHAT ===== */
      .preview-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-card);
      }
      .preview-header h4 {
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .preview-header p {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      .preview-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
      }
      .message-user {
        align-self: flex-end;
        background: var(--uzz-mint);
        color: white;
        border-bottom-right-radius: 4px;
      }
      .message-bot {
        align-self: flex-start;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-bottom-left-radius: 4px;
      }

      .typing-indicator {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        width: fit-content;
      }
      .typing-dot {
        width: 8px;
        height: 8px;
        background: var(--text-muted);
        border-radius: 50%;
        animation: typing 1.4s infinite ease-in-out;
      }
      .typing-dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      .typing-dot:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing {
        0%,
        60%,
        100% {
          transform: translateY(0);
        }
        30% {
          transform: translateY(-4px);
        }
      }

      .preview-input {
        padding: 16px;
        border-top: 1px solid var(--border-color);
        display: flex;
        gap: 8px;
        background: var(--bg-card);
      }
      .preview-input input {
        flex: 1;
      }

      /* ===== SLIDER ===== */
      .slider-container {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .slider-labels {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 8px;
      }
      .slider {
        flex: 1;
        -webkit-appearance: none;
        height: 6px;
        border-radius: 3px;
        background: var(--bg-input);
      }
      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--uzz-mint);
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(26, 188, 156, 0.4);
      }
      .slider-value {
        min-width: 52px;
        text-align: center;
        padding: 6px 10px;
        background: var(--bg-surface);
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        color: var(--uzz-mint);
      }

      /* ===== THEME TOGGLE ===== */
      .theme-toggle {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 200;
        font-size: 20px;
      }

      /* ===== SECTION DIVIDER ===== */
      .section-title {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-muted);
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-color);
      }

      /* ===== EMPTY STATE ===== */
      .empty-state {
        text-align: center;
        padding: 48px 24px;
      }
      .empty-state-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      .empty-state h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .empty-state p {
        color: var(--text-muted);
        margin-bottom: 24px;
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 900px) {
        .modal-body {
          flex-direction: column;
        }
        .preview-panel {
          width: 100%;
          border-left: none;
          border-top: 1px solid var(--border-color);
          max-height: 350px;
        }
      }

      @media (max-width: 768px) {
        .container {
          padding: 16px;
        }
        .agents-grid {
          grid-template-columns: 1fr;
        }
        .toggle-grid {
          grid-template-columns: 1fr;
        }
        .form-row {
          grid-template-columns: 1fr;
        }
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        .tabs {
          overflow-x: auto;
          flex-wrap: nowrap;
          -webkit-overflow-scrolling: touch;
        }
      }

      /* ===== ANIMATIONS ===== */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .agent-card {
        animation: fadeIn 0.3s ease-out;
      }

      .modal {
        animation: fadeIn 0.2s ease-out;
      }
    </style>
  </head>
  <body>
    <!-- Theme Toggle -->
    <button
      class="btn btn-ghost theme-toggle"
      onclick="document.body.classList.toggle('light')"
      title="Alternar tema"
    >
      🌙
    </button>

    <div class="container">
      <!-- Header -->
      <div class="header">
        <div>
          <h1>🤖 Meus Agentes</h1>
          <p>Configure e gerencie seus assistentes virtuais de IA</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary">📊 Experimentos</button>
          <button class="btn btn-secondary">🕐 Agendamento</button>
          <button class="btn btn-primary" onclick="showModal()">
            <span>+</span> Novo Agente
          </button>
        </div>
      </div>

      <!-- Page Tabs -->
      <div class="page-tabs">
        <button class="page-tab active">Todos</button>
        <button class="page-tab">Ativos</button>
        <button class="page-tab">Arquivados</button>
      </div>

      <!-- Agent Cards Grid -->
      <div class="agents-grid">
        <!-- Card 1: Active Agent -->
        <div class="agent-card active">
          <div class="agent-card-header">
            <div class="agent-avatar">👩‍💼</div>
            <div class="agent-info">
              <h3>Maria - Vendas</h3>
              <p>Especialista em vendas e atendimento ao cliente</p>
            </div>
          </div>
          <div class="agent-card-body">
            <div class="agent-tags">
              <span class="tag tag-mint">Profissional</span>
              <span class="tag tag-blue">RAG Ativo</span>
              <span class="tag tag-gold">Groq</span>
            </div>
            <div class="agent-stats">
              <div class="stat">
                <div class="stat-value">1.2k</div>
                <div class="stat-label">Conversas</div>
              </div>
              <div class="stat">
                <div class="stat-value">94%</div>
                <div class="stat-label">Satisfacao</div>
              </div>
              <div class="stat">
                <div class="stat-value">2.1s</div>
                <div class="stat-label">Resposta</div>
              </div>
            </div>
          </div>
          <div class="agent-card-footer">
            <span class="status-badge status-active">
              <span>●</span> Ativo
            </span>
            <div class="card-actions">
              <button
                class="btn btn-ghost"
                title="Editar"
                onclick="showModal()"
              >
                ✏️
              </button>
              <button class="btn btn-ghost" title="Duplicar">📋</button>
              <button class="btn btn-ghost" title="Historico">🕐</button>
            </div>
          </div>
        </div>

        <!-- Card 2: Inactive Agent -->
        <div class="agent-card">
          <div class="agent-card-header">
            <div class="agent-avatar">🧑‍💻</div>
            <div class="agent-info">
              <h3>Carlos - Suporte</h3>
              <p>Suporte tecnico e resolucao de problemas</p>
            </div>
          </div>
          <div class="agent-card-body">
            <div class="agent-tags">
              <span class="tag tag-mint">Tecnico</span>
              <span class="tag tag-blue">Tools</span>
            </div>
            <div class="agent-stats">
              <div class="stat">
                <div class="stat-value">856</div>
                <div class="stat-label">Conversas</div>
              </div>
              <div class="stat">
                <div class="stat-value">89%</div>
                <div class="stat-label">Satisfacao</div>
              </div>
              <div class="stat">
                <div class="stat-value">3.4s</div>
                <div class="stat-label">Resposta</div>
              </div>
            </div>
          </div>
          <div class="agent-card-footer">
            <span class="status-badge status-inactive">
              <span>○</span> Inativo
            </span>
            <div class="card-actions">
              <button class="btn btn-ghost" title="Ativar">⚡</button>
              <button
                class="btn btn-ghost"
                title="Editar"
                onclick="showModal()"
              >
                ✏️
              </button>
              <button class="btn btn-ghost" title="Duplicar">📋</button>
            </div>
          </div>
        </div>

        <!-- Card 3: Another Agent -->
        <div class="agent-card">
          <div class="agent-card-header">
            <div class="agent-avatar">🎯</div>
            <div class="agent-info">
              <h3>Ana - Qualificacao</h3>
              <p>Qualificacao de leads e agendamento de reunioes</p>
            </div>
          </div>
          <div class="agent-card-body">
            <div class="agent-tags">
              <span class="tag tag-mint">Consultivo</span>
              <span class="tag tag-gold">OpenAI</span>
            </div>
            <div class="agent-stats">
              <div class="stat">
                <div class="stat-value">234</div>
                <div class="stat-label">Conversas</div>
              </div>
              <div class="stat">
                <div class="stat-value">91%</div>
                <div class="stat-label">Satisfacao</div>
              </div>
              <div class="stat">
                <div class="stat-value">2.8s</div>
                <div class="stat-label">Resposta</div>
              </div>
            </div>
          </div>
          <div class="agent-card-footer">
            <span class="status-badge status-inactive">
              <span>○</span> Inativo
            </span>
            <div class="card-actions">
              <button class="btn btn-ghost" title="Ativar">⚡</button>
              <button class="btn btn-ghost" title="Editar">✏️</button>
              <button class="btn btn-ghost" title="Duplicar">📋</button>
            </div>
          </div>
        </div>

        <!-- Create New Card -->
        <div class="create-card" onclick="showModal()">
          <div class="create-card-icon">+</div>
          <h3>Criar Novo Agente</h3>
          <p>Comece do zero ou use um template</p>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <div class="modal-overlay" id="editorModal" style="display: none;">
      <div class="modal">
        <div class="modal-header">
          <h2>
            <span style="font-size: 24px;">👩‍💼</span>
            Editar Agente: Maria - Vendas
          </h2>
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-ghost" onclick="hideModal()">
              Cancelar
            </button>
            <button class="btn btn-secondary">👁️ Ver Prompt</button>
            <button class="btn btn-primary">💾 Salvar</button>
          </div>
        </div>

        <div class="modal-body">
          <!-- Editor Panel -->
          <div class="editor-panel">
            <!-- Tabs -->
            <div class="tabs">
              <button class="tab active" data-tab="identity">
                🎭 Identidade
              </button>
              <button class="tab" data-tab="tone">💬 Como Responder</button>
              <button class="tab" data-tab="behavior">🎯 O Que Fazer</button>
              <button class="tab" data-tab="tools">🔧 Ferramentas</button>
              <button class="tab" data-tab="model">⚙️ Modelo IA</button>
            </div>

            <!-- Tab Content: Identity -->
            <div class="tab-content" id="tab-identity">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nome do Agente</label>
                  <input
                    type="text"
                    class="form-input"
                    value="Maria - Vendas"
                    placeholder="Ex: Maria - Vendas"
                  />
                  <p class="form-hint">
                    Nome que identifica este agente no sistema
                  </p>
                </div>

                <div class="form-group">
                  <label class="form-label">Avatar</label>
                  <div class="avatar-picker">
                    <div class="avatar-option selected">👩‍💼</div>
                    <div class="avatar-option">🤖</div>
                    <div class="avatar-option">💼</div>
                    <div class="avatar-option">🎯</div>
                    <div class="avatar-option">🧑‍💻</div>
                    <div class="avatar-option">👨‍💼</div>
                    <div class="avatar-option">🦊</div>
                    <div class="avatar-option">🐱</div>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Descricao Curta</label>
                <input
                  type="text"
                  class="form-input"
                  value="Especialista em vendas e atendimento ao cliente"
                  placeholder="Uma frase descrevendo o agente"
                />
                <p class="form-hint">Aparece no card do agente</p>
              </div>

              <div class="form-group">
                <label class="form-label">Quem e este agente?</label>
                <textarea
                  class="form-textarea"
                  placeholder="Descreva detalhadamente o papel e a personalidade deste agente..."
                >
Sou a Maria, assistente virtual da empresa XYZ. Sou especializada em ajudar clientes a encontrar o produto ideal para suas necessidades, tirar duvidas sobre nossos servicos e guia-los durante o processo de compra.

Tenho amplo conhecimento sobre nosso catalogo de produtos e estou sempre disposta a ajudar de forma acolhedora e profissional.</textarea
                >
                <p class="form-hint">
                  Esta descricao define a personalidade base do agente
                </p>
              </div>

              <div class="form-group">
                <label class="form-label">Objetivo Principal</label>
                <textarea
                  class="form-textarea"
                  placeholder="Qual a missao principal deste agente?"
                >
Meu objetivo e entender a necessidade do cliente, apresentar as melhores solucoes disponiveis e guia-lo ate a conclusao da compra ou agendamento de uma reuniao com um consultor.</textarea
                >
                <p class="form-hint">
                  O que o agente deve buscar alcançar em cada conversa
                </p>
              </div>
            </div>

            <!-- Tab Content: Tone (Hidden) -->
            <div class="tab-content" id="tab-tone" style="display: none;">
              <div class="section-title">Estilo de Comunicacao</div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tom de Voz</label>
                  <select class="form-select">
                    <option value="professional" selected>
                      👔 Profissional - Respeitoso e confiavel
                    </option>
                    <option value="friendly">
                      😊 Amigavel - Acolhedor e simpatico
                    </option>
                    <option value="formal">📜 Formal - Serio e tecnico</option>
                    <option value="casual">
                      🎉 Casual - Descontraido e informal
                    </option>
                  </select>
                  <p class="form-hint">Define como o agente se expressa</p>
                </div>

                <div class="form-group">
                  <label class="form-label">Estilo de Resposta</label>
                  <select class="form-select">
                    <option value="helpful">
                      🤝 Prestativo - Oferece solucoes proativamente
                    </option>
                    <option value="direct">
                      🎯 Direto - Objetivo e conciso
                    </option>
                    <option value="educational">
                      📚 Educativo - Explica conceitos
                    </option>
                    <option value="consultative" selected>
                      💡 Consultivo - Faz perguntas para entender
                    </option>
                  </select>
                  <p class="form-hint">Como o agente aborda os problemas</p>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Tamanho das Respostas</label>
                <select class="form-select">
                  <option value="short">
                    📝 Curtas - 1 a 2 frases, bem objetivas
                  </option>
                  <option value="medium" selected>
                    📄 Medias - 3 a 5 frases, balanceadas
                  </option>
                  <option value="long">
                    📖 Longas - Detalhadas quando necessario
                  </option>
                </select>
              </div>

              <div class="section-title" style="margin-top: 32px;">
                Preferencias
              </div>

              <div class="toggle-grid">
                <div class="toggle-card">
                  <div class="toggle-card-header">
                    <h4>😀 Usar Emojis</h4>
                    <div class="toggle-switch"></div>
                  </div>
                  <p>
                    Permite que o agente use emojis nas respostas para tornar a
                    comunicacao mais expressiva
                  </p>
                </div>

                <div class="toggle-card active">
                  <div class="toggle-card-header">
                    <h4>📝 Dividir Mensagens</h4>
                    <div class="toggle-switch"></div>
                  </div>
                  <p>
                    Divide respostas longas em multiplas mensagens menores para
                    melhor leitura
                  </p>
                </div>
              </div>
            </div>

            <!-- Tab Content: Behavior (Hidden) -->
            <div class="tab-content" id="tab-behavior" style="display: none;">
              <div class="section-title">Mensagens Padrao</div>

              <div class="form-group">
                <label class="form-label">Mensagem de Saudacao</label>
                <input
                  type="text"
                  class="form-input"
                  value="Ola! Bem-vindo a empresa XYZ! Sou a Maria e estou aqui para ajuda-lo. Como posso ajudar hoje?"
                  placeholder="Primeira mensagem ao iniciar conversa"
                />
                <p class="form-hint">
                  Enviada quando o cliente inicia uma nova conversa
                </p>
              </div>

              <div class="form-group">
                <label class="form-label">Mensagem de Fallback</label>
                <input
                  type="text"
                  class="form-input"
                  value="Desculpe, nao consegui entender sua mensagem. Poderia reformular de outra forma?"
                  placeholder="Quando nao entender a mensagem"
                />
                <p class="form-hint">
                  Usada quando o agente nao consegue processar a mensagem
                </p>
              </div>

              <div class="section-title" style="margin-top: 32px;">
                Regras de Comportamento
              </div>

              <div class="form-group">
                <label class="form-label">Topicos Proibidos</label>
                <input
                  type="text"
                  class="form-input"
                  value="politica, religiao, concorrentes"
                  placeholder="Separe por virgulas"
                />
                <p class="form-hint">
                  O agente nunca falara sobre esses assuntos
                </p>
              </div>

              <div class="form-group">
                <label class="form-label">Sempre Mencionar</label>
                <input
                  type="text"
                  class="form-input"
                  value="promocao de janeiro, frete gratis acima de R$200"
                  placeholder="Separe por virgulas"
                />
                <p class="form-hint">
                  O agente tentara mencionar esses pontos quando apropriado
                </p>
              </div>
            </div>

            <!-- Tab Content: Tools (Hidden) -->
            <div class="tab-content" id="tab-tools" style="display: none;">
              <div class="section-title">Ferramentas Disponiveis</div>
              <p style="color: var(--text-muted); margin-bottom: 20px;">
                Habilite as ferramentas que este agente pode utilizar durante as
                conversas
              </p>

              <div class="toggle-grid">
                <div class="toggle-card active">
                  <div class="toggle-card-header">
                    <h4>👤 Transferir para Humano</h4>
                    <div class="toggle-switch"></div>
                  </div>
                  <p>
                    Permite que o agente transfira a conversa para um atendente
                    humano quando solicitado
                  </p>
                </div>

                <div class="toggle-card active">
                  <div class="toggle-card-header">
                    <h4>📄 Buscar Documentos</h4>
                    <div class="toggle-switch"></div>
                  </div>
                  <p>
                    Permite enviar PDFs, catalogos e arquivos da base de
                    conhecimento
                  </p>
                </div>

                <div class="toggle-card">
                  <div class="toggle-card-header">
                    <h4>🎤 Responder em Audio</h4>
                    <div class="toggle-switch"></div>
                  </div>
                  <p>Permite enviar respostas como mensagens de voz (TTS)</p>
                </div>

                <div class="toggle-card active">
                  <div class="toggle-card-header">
                    <h4>📚 Base de Conhecimento</h4>
                    <div class="toggle-switch"></div>
                  </div>
                  <p>
                    Consulta documentos da base RAG para enriquecer as respostas
                  </p>
                </div>
              </div>

              <div class="section-title" style="margin-top: 32px;">
                Configuracoes RAG
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Limiar de Similaridade</label>
                  <div class="slider-container">
                    <input
                      type="range"
                      class="slider"
                      min="50"
                      max="95"
                      value="70"
                    />
                    <div class="slider-value">0.70</div>
                  </div>
                  <p class="form-hint">
                    Minimo de similaridade para considerar um documento
                    relevante
                  </p>
                </div>

                <div class="form-group">
                  <label class="form-label">Maximo de Resultados</label>
                  <div class="slider-container">
                    <input
                      type="range"
                      class="slider"
                      min="1"
                      max="10"
                      value="5"
                    />
                    <div class="slider-value">5</div>
                  </div>
                  <p class="form-hint">
                    Quantidade maxima de documentos retornados
                  </p>
                </div>
              </div>
            </div>

            <!-- Tab Content: Model (Hidden) -->
            <div class="tab-content" id="tab-model" style="display: none;">
              <div class="section-title">Provedor e Modelo</div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Provedor de IA</label>
                  <select class="form-select">
                    <option value="groq" selected>
                      ⚡ Groq - Rapido e economico (Recomendado)
                    </option>
                    <option value="openai">
                      🧠 OpenAI - GPT-4 mais preciso
                    </option>
                  </select>
                  <p class="form-hint">
                    Groq oferece respostas mais rapidas a menor custo
                  </p>
                </div>

                <div class="form-group">
                  <label class="form-label">Modelo</label>
                  <select class="form-select">
                    <option value="llama-3.3-70b" selected>
                      Llama 3.3 70B Versatile (Recomendado)
                    </option>
                    <option value="llama-3.1-70b">
                      Llama 3.1 70B Versatile
                    </option>
                    <option value="llama-3.1-8b">
                      Llama 3.1 8B Instant (Mais rapido)
                    </option>
                    <option value="mixtral-8x7b">Mixtral 8x7B</option>
                  </select>
                </div>
              </div>

              <div class="section-title" style="margin-top: 32px;">
                Parametros do Modelo
              </div>

              <div class="form-group">
                <label class="form-label">Temperatura (Criatividade)</label>
                <div class="slider-labels">
                  <span>🎯 Preciso</span>
                  <span>🎨 Criativo</span>
                </div>
                <div class="slider-container">
                  <input
                    type="range"
                    class="slider"
                    min="0"
                    max="200"
                    value="70"
                  />
                  <div class="slider-value">0.70</div>
                </div>
                <p class="form-hint">
                  Valores mais altos geram respostas mais variadas e criativas
                </p>
              </div>

              <div class="form-group">
                <label class="form-label">Maximo de Tokens</label>
                <div class="slider-container">
                  <input
                    type="range"
                    class="slider"
                    min="500"
                    max="8000"
                    value="2000"
                  />
                  <div class="slider-value">2000</div>
                </div>
                <p class="form-hint">
                  Limite maximo de tokens por resposta do modelo
                </p>
              </div>
            </div>
          </div>

          <!-- Preview Panel -->
          <div class="preview-panel">
            <div class="preview-header">
              <h4>💬 Preview em Tempo Real</h4>
              <p>Teste o agente com as configuracoes atuais</p>
            </div>

            <div class="preview-messages">
              <div class="message message-user">
                Ola, gostaria de saber sobre seus servicos
              </div>
              <div class="message message-bot">
                Ola! Bem-vindo a empresa XYZ! Sou a Maria e estou aqui para
                ajuda-lo. Trabalhamos com consultoria em engenharia eletrica,
                energia solar e desenvolvimento de software. Qual area mais te
                interessa?
              </div>
              <div class="message message-user">
                Energia solar para minha empresa
              </div>
              <div class="message message-bot">
                Excelente escolha! A energia solar pode reduzir
                significativamente os custos de energia da sua empresa. Para te
                passar uma proposta personalizada, preciso de algumas
                informacoes: 1. Qual o consumo medio mensal de energia (em kWh)?
                2. Voce e proprietario ou locatario do imovel? Com esses dados,
                posso calcular a economia estimada!
              </div>
            </div>

            <div class="preview-input">
              <input
                type="text"
                class="form-input"
                placeholder="Digite uma mensagem de teste..."
              />
              <button class="btn btn-primary">Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Modal functions
      function showModal() {
        document.getElementById("editorModal").style.display = "flex";
      }

      function hideModal() {
        document.getElementById("editorModal").style.display = "none";
      }

      // Close modal on overlay click
      document.getElementById("editorModal").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
          hideModal();
        }
      });

      // Close on Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          hideModal();
        }
      });

      // Tab switching
      document.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          // Update active tab
          document
            .querySelectorAll(".tab")
            .forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");

          // Show corresponding content
          const tabId = tab.getAttribute("data-tab");
          document.querySelectorAll(".tab-content").forEach((content) => {
            content.style.display = "none";
          });
          document.getElementById("tab-" + tabId).style.display = "block";
        });
      });

      // Toggle cards
      document.querySelectorAll(".toggle-card").forEach((card) => {
        card.addEventListener("click", () => {
          card.classList.toggle("active");
        });
      });

      // Avatar picker
      document.querySelectorAll(".avatar-option").forEach((option) => {
        option.addEventListener("click", () => {
          document
            .querySelectorAll(".avatar-option")
            .forEach((o) => o.classList.remove("selected"));
          option.classList.add("selected");
        });
      });

      // Theme toggle icon update
      const themeBtn = document.querySelector(".theme-toggle");
      themeBtn.addEventListener("click", () => {
        themeBtn.textContent = document.body.classList.contains("light")
          ? "☀️"
          : "🌙";
      });

      // Slider value updates
      document.querySelectorAll(".slider").forEach((slider) => {
        const valueDisplay =
          slider.parentElement.querySelector(".slider-value");
        if (valueDisplay) {
          slider.addEventListener("input", () => {
            let value = slider.value;
            // Format based on context
            if (slider.max == "200") {
              value = (value / 100).toFixed(2);
            } else if (slider.max == "95") {
              value = (value / 100).toFixed(2);
            }
            valueDisplay.textContent = value;
          });
        }
      });

      // Page tabs
      document.querySelectorAll(".page-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          document
            .querySelectorAll(".page-tab")
            .forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
        });
      });
    </script>
  </body>
</html>
```

---

## ✅ Status de Implementação (Atualizado: 2026-01-31)

### Funcionalidades Core - IMPLEMENTADAS ✅

| Feature                              | Status      | Localização                                                |
| ------------------------------------ | ----------- | ---------------------------------------------------------- |
| Tabela `agents`                      | ✅ Completa | `supabase/migrations/20260131_create_agents_table.sql`     |
| Campos de timing                     | ✅ Completa | `supabase/migrations/20260131_add_agent_timing_fields.sql` |
| API GET `/api/agents`                | ✅ Completa | `src/app/api/agents/route.ts`                              |
| API GET `/api/agents/[id]`           | ✅ Completa | `src/app/api/agents/[id]/route.ts`                         |
| API POST `/api/agents`               | ✅ Completa | `src/app/api/agents/route.ts`                              |
| API PATCH `/api/agents/[id]`         | ✅ Completa | `src/app/api/agents/[id]/route.ts`                         |
| API DELETE `/api/agents/[id]`        | ✅ Completa | `src/app/api/agents/[id]/route.ts`                         |
| API POST `/api/agents/[id]/activate` | ✅ Completa | `src/app/api/agents/[id]/activate/route.ts`                |
| API POST `/api/agents/[id]/test`     | ✅ Completa | `src/app/api/agents/[id]/test/route.ts`                    |
| Dashboard página `/dashboard/agents` | ✅ Completa | `src/app/dashboard/agents/page.tsx`                        |
| Cards de Agentes (lista)             | ✅ Completa | `src/app/dashboard/agents/page.tsx`                        |
| AgentEditor (formulário)             | ✅ Completa | `src/components/agents/AgentEditor.tsx`                    |
| AgentEditorModal                     | ✅ Completa | `src/components/agents/AgentEditorModal.tsx`               |
| Preview/Teste no Editor              | ✅ Completa | Integrado no AgentEditorModal                              |
| Ativação com 1 clique                | ✅ Completa | `handleActivateAgent()`                                    |
| Link no sidebar                      | ✅ Completa | Sidebar do dashboard                                       |

### Integração Backend - IMPLEMENTADA ✅

| Feature                         | Status      | Detalhes                                      |
| ------------------------------- | ----------- | --------------------------------------------- |
| `getActiveAgent()`              | ✅ Completa | `src/lib/config.ts` - busca agente ativo      |
| `getClientConfig()` merge       | ✅ Completa | Mescla config do agente ativo                 |
| `batchMessages` usa timing      | ✅ Completa | `batching_delay_seconds` do agente            |
| `getChatHistory` usa config     | ✅ Completa | `maxChatHistory` do agente                    |
| `sendWhatsAppMessage` usa delay | ✅ Completa | `messageDelayMs` do agente                    |
| `generateAIResponse` usa agente | ✅ Completa | Via `config.prompts.systemPrompt`             |
| Model/Provider do agente        | ✅ Completa | `primaryProvider`, `openaiModel`, `groqModel` |
| Temperature/MaxTokens           | ✅ Completa | Via `config.settings.temperature/maxTokens`   |
| Tools (enableTools)             | ✅ Completa | Via `config.settings.enableTools`             |

### Campos do Agente Usados pelo Backend

```typescript
// getClientConfig() agora mescla automaticamente:
{
  settings: {
    batchingDelaySeconds: agent.batching_delay_seconds,     // ✅
    maxChatHistory: agent.max_chat_history,                 // ✅
    messageDelayMs: agent.message_delay_ms,                 // ✅
    messageSplitEnabled: agent.message_split_enabled,       // ✅
    enableTools: agent.enable_tools,                        // ✅
    enableRAG: agent.enable_rag,                            // ✅
    enableHumanHandoff: agent.enable_human_handoff,         // ✅
    maxTokens: agent.max_tokens,                            // ✅
    temperature: agent.temperature,                         // ✅
    tts_enabled: agent.enable_audio_response,               // ✅
  },
  prompts: {
    systemPrompt: agent.compiled_system_prompt,             // ✅
    formatterPrompt: agent.compiled_formatter_prompt,       // ✅
  },
  models: {
    openaiModel: agent.openai_model,                        // ✅
    groqModel: agent.groq_model,                            // ✅
  },
  primaryProvider: agent.primary_provider,                  // ✅
  activeAgent: agent,                                       // ✅ (referência completa)
}
```

### Funcionalidades Extras - STATUS ATUALIZADO

| Feature                        | Status          | Tabela DB                    | Prioridade |
| ------------------------------ | --------------- | ---------------------------- | ---------- |
| **Templates pré-configurados** | ✅ Implementado | `src/lib/agent-templates.ts` | Média      |
| **Histórico de Versões**       | ✅ Implementado | `agent_versions` + trigger   | Baixa      |
| **Agendamento por horário**    | ✅ Implementado | `agent_schedules` + APIs     | Baixa      |
| **A/B Testing**                | ✅ Implementado | `agent_experiments` + APIs   | Baixa      |

### Componentes Extras - STATUS ATUALIZADO

| Componente                | Status          | Descrição                                  |
| ------------------------- | --------------- | ------------------------------------------ |
| `AgentPreviewChat.tsx`    | ✅ Implementado | Chat de preview (integrado no modal atual) |
| `TemplateSelector.tsx`    | ✅ Implementado | Integrado no `AgentEditorModal.tsx`        |
| `AgentVersionHistory.tsx` | ✅ Implementado | Histórico de versões com rollback          |
| `AgentScheduler.tsx`      | ✅ Implementado | Configuração de horários                   |
| `ABTestDashboard.tsx`     | ✅ Implementado | Dashboard de experimentos A/B              |

---

## Próximos Passos Recomendados

### ✅ Fase 3 - Templates (CONCLUÍDA)

- [x] Templates definidos em `src/lib/agent-templates.ts`:
  - Vendedor (tom persuasivo, foco em conversão)
  - Suporte Técnico (tom empático, foco em resolução)
  - Qualificador de Leads (tom consultivo)
  - Atendente Geral (tom neutro)
  - Consultor Premium (tom profissional)
- [x] Seletor de templates no `AgentEditorModal.tsx` (aba Identidade)

### ✅ Fase 4 - Histórico de Versões (CONCLUÍDA)

- [x] Trigger SQL para auto-save em `agent_versions` (`20260131_agent_version_trigger.sql`)
- [x] Componente `AgentVersionHistory.tsx` criado
- [x] API `/api/agents/[id]/versions` (GET lista, POST cria)
- [x] API `/api/agents/[id]/versions/[versionId]/restore` (POST restaura)
- [x] Botão "Histórico" no `AgentEditorModal.tsx`
- [x] Trigger mantém últimas 20 versões por agente

### ✅ Fase 5 - Agendamento (CONCLUÍDA)

- [x] API `/api/agents/schedules` (GET/PUT)
- [x] Componente `AgentScheduler.tsx` criado
- [x] UI para configurar regras por dia/horário
- [x] Seleção de agente padrão para períodos não cobertos
- [x] Seletor de timezone
- [x] Botão "Agendamento" na página `/dashboard/agents`

### ✅ Fase 6 - A/B Testing (CONCLUÍDA)

- [x] API `/api/agents/experiments` (GET/POST)
- [x] API `/api/agents/experiments/[id]` (GET/PATCH/DELETE)
- [x] Componente `ABTestDashboard.tsx` criado
- [x] UI para criar/ativar/pausar experimentos
- [x] Seletor de agentes A vs B
- [x] Slider de split de tráfego (10-90%)
- [x] Botão "Teste A/B" na página `/dashboard/agents`

---

## Conclusão

**🎉 O sistema de agentes está 100% COMPLETO!**

Todas as 6 fases foram implementadas:

| Fase | Descrição                  | Status      |
| ---- | -------------------------- | ----------- |
| 1    | Core da página + CRUD      | ✅ Completo |
| 2    | Preview Chat + Teste       | ✅ Completo |
| 3    | Templates pré-configurados | ✅ Completo |
| 4    | Histórico de Versões       | ✅ Completo |
| 5    | Agendamento por horário    | ✅ Completo |
| 6    | A/B Testing                | ✅ Completo |

O `generateAIResponse.ts` JÁ USA as configurações do agente ativo via:

1. `config.prompts.systemPrompt` → vem do `agent.compiled_system_prompt`
2. `config.settings.temperature` → vem do `agent.temperature`
3. `config.settings.maxTokens` → vem do `agent.max_tokens`
4. `config.settings.enableTools` → vem do `agent.enable_tools`
5. `config.primaryProvider` → vem do `agent.primary_provider`
6. `config.models.openaiModel/groqModel` → vem do `agent.openai_model/groq_model`

A integração é transparente - basta ativar um agente no dashboard e todo o backend passa a usar suas configurações.
