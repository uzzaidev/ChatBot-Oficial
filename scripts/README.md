# Scripts Operacionais

Esta pasta concentra CLIs, migrações pontuais, exports e validações locais do projeto.

## Comandos No `package.json`

| Comando | Script |
| --- | --- |
| `npm run build:mobile` | `scripts/build-mobile.js` |
| `npm run db:export` | `scripts/export-database-schema.js` |
| `npm run db:map` | `scripts/analyze_supabase.py` |
| `npm run contacts:xlsx-to-csv -- arquivo.xlsx` | `scripts/xlsx-to-csv.js` |
| `npm run export:features-pdf` | `scripts/generate-pdf.js` |
| `npm run export:uzzapp-commercial-pdf` | `scripts/export-uzzapp-commercial-pdf.js` |
| `npm run ios:validate-urls` | `scripts/ios-validate-public-urls.mjs` |

## Contatos

Converter XLSX para CSV:

```bash
npm run contacts:xlsx-to-csv -- data/contacts/umana/arquivo.xlsx --out data/contacts/umana/CSVs
```

Também é possível chamar diretamente:

```bash
node scripts/xlsx-to-csv.js arquivo.xlsx --list-sheets
node scripts/xlsx-to-csv.js arquivo.xlsx --sheet "Aba" --delimiter ";"
```

## Banco

Exportar schema:

```bash
npm run db:export
```

Mapear usos de Supabase no código:

```bash
npm run db:map
```

## Android Release No Windows

```powershell
.\scripts\android-preflight-check.ps1
.\scripts\build-android-release.ps1
```

O artefato final é gerado em `android/app/build/outputs/bundle/release/app-release.aab`.

## Migração De Blocos De Transferência

```bash
npx tsx scripts/migrate-transfer-blocks.ts
```

A migração é idempotente e adiciona defaults ausentes em blocos `ai_handoff` e `human_handoff`.
