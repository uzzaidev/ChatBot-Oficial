---
title: ChatBot Oficial State Facts 2026 03 31
tags: []
related: [architecture/project_state/chatbot_oficial_snapshot_2026_03_31.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-31T12:31:06.691Z'
updatedAt: '2026-03-31T12:31:06.691Z'
---
## Raw Concept
**Task:**
Record durable project facts from the 2026-03-31 repository snapshot

**Changes:**
- Added dated facts for stack, validation status, documentation drift, and recent product focus

**Files:**
- README.md
- package.json

**Flow:**
inspect repo -> extract concrete facts -> store in facts/project

**Timestamp:** 2026-03-31

## Narrative
### Structure
This entry stores concise factual statements that can be recalled independently of the broader architecture snapshot. It covers platform identity, current stack, validation outcomes, documentation mismatch, and build-verification caveats.

### Dependencies
These facts depend on repository inspection evidence present at the time of curation and may change as package versions, documentation, or validation results evolve.

### Highlights
Key recall items are the project being a multi-tenant WhatsApp AI SaaS, the apparent Next.js 16 + React 18 stack, passing tests, warning-only lint, documentation drift in README, and Meta/WhatsApp-heavy recent changes.

## Facts
- **project_type**: The project ChatBot-Oficial is a multi-tenant SaaS for WhatsApp customer service with AI. [project]
- **frontend_stack**: The main application stack is Next.js 16 with React 18. [project]
- **core_dependencies**: The repository uses Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor and Jest. [project]
- **documentation_drift**: README still describes Next.js 14 while package.json indicates Next.js 16, suggesting documentation drift. [project]
- **test_status**: Local tests passed with 3 suites and 10 tests. [project]
- **lint_status**: Lint completed without errors and reported 12 warnings. [project]
- **recent_focus**: Recent development focus emphasized Meta and WhatsApp integration, including coexistence sync, unified multi-tenant webhook, SMB echoes, Embedded Signup, dashboard/settings, and better logging/error handling. [project]
- **build_validation_status**: A production build was not fully revalidated outside the sandbox; a sandbox EPERM spawn failure was treated as an environmental limitation rather than an application defect. [environment]
