---
title: Dashboard session — Agent QA tab, billing +1 free month, GT matcher
summary: Three dashboard changes — the agent QA tab (battery + saved reports + AI evaluation), admin "+1 free month" billing action, and the ground-truth matcher service-role client pattern.
tags: [agents, qa, billing, stripe, ground-truth, testing]
related: []
keywords: [qa_questions, agent_qa_reports, qa-evaluator, extend_free_month, trial_end, createServiceRoleClient, prompt-evaluator]
---
## A. Agent QA tab
- The agent editor (AgentEditorModal) has a **QA** tab for prompt regression testing.
- Reusable test-question battery is stored per agent in DB column `agents.qa_questions` (JSONB array of `{id,text}`), persisted via the normal agent PATCH/POST.
- Running the battery loops the existing endpoint `POST /api/agents/[id]/test` once per question — each question answered in **isolation** (no shared history), with production parity for RAG/tools/model and no side effects or billing.
- Answers are saved as a report in DB table `agent_qa_reports` (results JSONB, agent_snapshot, model_used).
- A saved report is evaluated by AI: `src/lib/qa-evaluator.ts` + `POST /api/agents/[id]/qa/reports/[reportId]/evaluate`. It scores each answer good/partial/bad and returns applyable prompt-fix suggestions, reusing the prompt-evaluator segment->PromptSuggestion mapping and the shared `PromptSuggestionCard` (extracted from `PromptEvaluatorPanel` to avoid duplication).
- Migrations `20260613120000` (qa tables) and `20260613130000` (evaluation columns) still require `supabase db push`.

## B. Billing — give an existing client +1 free month
- Admin action at `dashboard/admin/billing` -> Assinaturas -> **"+1 mês grátis"** button.
- Implemented as `PATCH /api/admin/billing/subscriptions/[id]` with `action: "extend_free_month"`: it pushes the next billing date by N months via `stripe.subscriptions.update({ trial_end, proration_behavior: "none" })` — **no coupon**.
- Rationale: the Stripe Customer Portal has no promo-code field for an existing subscription, so coupon-after-checkout isn't possible self-service; extending `trial_end` is the clean "+1 free month". Coupons in this app apply only at checkout (`discounts`) or subscription creation (`subParams.coupon`).

## C. Ground-truth matcher client pattern
- `src/lib/ground-truth-matcher.ts` uses `createServiceRoleClient()` (synchronous, service-role) — changed from `await createServerClient()` in commit `a7ddd6d`.
- When mocking `@/lib/supabase` in tests, mock `createServiceRoleClient` with `mockReturnValue` (synchronous), NOT `createServerClient`/`mockResolvedValue`.
