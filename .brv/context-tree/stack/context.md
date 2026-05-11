# STACK — ChatBot-Oficial

**Checkpoint:** 2026-04-16

## Framework & Runtime
- Next.js 16 (App Router, serverless on Vercel)
- TypeScript (`strict: false`)
- Tailwind CSS + shadcn/ui

## Backend / Database
- Supabase (PostgreSQL + pgvector + Vault + Storage + Realtime)
- Redis (self-hosted) / Upstash Redis (message batching)

## AI Providers
- Groq Llama 3.3 70B — chat primário (via `@ai-sdk/groq@^2`)
- OpenAI GPT-4o — visão, documentos, TTS, embeddings (via `@ai-sdk/openai@^2`)
- OpenAI Whisper — transcrição de áudio
- OpenAI `text-embedding-3-small` — embeddings RAG (1536 dims)
- ElevenLabs — TTS alternativo (chave compartilhada — tech debt)
- Vercel AI SDK v5 (`ai@^5`, `generateText()`)

## WhatsApp & Integrações
- Meta WhatsApp Business API v22.0
- Stripe + Stripe Connect (assinatura SaaS + loja white-label por tenant)
- Google Calendar + Microsoft Calendar (OAuth por cliente)
- Firebase Cloud Messaging (push notifications)
- Capacitor (iOS/Android mobile app)

## Comandos de Desenvolvimento
```bash
npm install
npm run dev            # localhost:3000
npx tsc --noEmit       # type check
npm run lint
supabase migration new <name>
supabase db push
```
