#!/usr/bin/env node
/**
 * xlsx-to-csv.js
 * Converte arquivo XLSX para CSV sem perda de informações.
 *
 * Uso:
 *   node scripts/xlsx-to-csv.js <arquivo.xlsx>                    → gera um CSV por aba
 *   node scripts/xlsx-to-csv.js <arquivo.xlsx> --sheet "Aba1"    → exporta só a aba indicada
 *   node scripts/xlsx-to-csv.js <arquivo.xlsx> --all             → exporta todas as abas (padrão)
 *   node scripts/xlsx-to-csv.js <arquivo.xlsx> --out ./saida     → pasta de destino
 *   node scripts/xlsx-to-csv.js <arquivo.xlsx> --delimiter ";"   → delimitador (padrão: ,)
 */

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// ── Argumentos ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Uso: node scripts/xlsx-to-csv.js <arquivo.xlsx> [opções]

Opções:
  --sheet "Nome"    Exporta somente a aba com esse nome
  --all             Exporta todas as abas (padrão)
  --out <pasta>     Pasta de destino (padrão: mesma pasta do arquivo)
  --delimiter <c>   Caractere delimitador (padrão: ,)
  --no-header       Não inclui linha de cabeçalho
  --list-sheets     Lista as abas do arquivo sem exportar
`)
  process.exit(0)
}

const inputFile = args[0]

const getArg = (flag, fallback = null) => {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
}

const hasFlag = (flag) => args.includes(flag)

const sheetFilter  = getArg('--sheet')
const outDir       = getArg('--out')
const delimiter    = getArg('--delimiter', ',')
const listOnly     = hasFlag('--list-sheets')
const noHeader     = hasFlag('--no-header')

// ── Validações ───────────────────────────────────────────────────────────────

if (!fs.existsSync(inputFile)) {
  console.error(`❌  Arquivo não encontrado: ${inputFile}`)
  process.exit(1)
}

const ext = path.extname(inputFile).toLowerCase()
if (!['.xlsx', '.xls', '.xlsm', '.xlsb', '.ods'].includes(ext)) {
  console.error(`❌  Formato não suportado: ${ext}. Use .xlsx, .xls, .xlsm, .xlsb ou .ods`)
  process.exit(1)
}

// ── Carregar workbook ────────────────────────────────────────────────────────

console.log(`📂  Lendo: ${inputFile}`)

const workbook = XLSX.readFile(inputFile, {
  cellDates: true,      // datas como objetos Date, não número serial
  cellNF: false,        // não preserva formatos numéricos (evita overhead)
  cellText: false,      // usa valores reais, não texto formatado
  dense: false,
  raw: false,           // aplica conversão de tipo (datas, booleans, etc.)
})

const sheetNames = workbook.SheetNames

console.log(`📋  Abas encontradas: ${sheetNames.join(', ')}`)

if (listOnly) {
  sheetNames.forEach((name, i) => {
    const sheet = workbook.Sheets[name]
    const range = sheet['!ref'] || 'vazia'
    console.log(`  [${i + 1}] "${name}" — range: ${range}`)
  })
  process.exit(0)
}

// ── Selecionar abas ──────────────────────────────────────────────────────────

const sheetsToExport = sheetFilter
  ? sheetNames.filter(n => n === sheetFilter)
  : sheetNames

if (sheetsToExport.length === 0) {
  console.error(`❌  Aba não encontrada: "${sheetFilter}"`)
  console.error(`    Abas disponíveis: ${sheetNames.join(', ')}`)
  process.exit(1)
}

// ── Pasta de saída ───────────────────────────────────────────────────────────

const resolvedOutDir = outDir
  ? path.resolve(outDir)
  : path.dirname(path.resolve(inputFile))

if (!fs.existsSync(resolvedOutDir)) {
  fs.mkdirSync(resolvedOutDir, { recursive: true })
  console.log(`📁  Pasta criada: ${resolvedOutDir}`)
}

const baseName = path.basename(inputFile, ext)

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formata um valor para CSV:
 * - Strings com vírgula/aspas/quebra de linha → envolve em aspas + escapa aspas internas
 * - Datas → ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
 * - Null/undefined → string vazia
 */
const formatCell = (value, delim) => {
  if (value === null || value === undefined) return ''

  if (value instanceof Date) {
    // Se tem hora relevante → datetime completo; se não → só data
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0
    return hasTime ? value.toISOString().replace('T', ' ').substring(0, 19) : value.toISOString().substring(0, 10)
  }

  const str = String(value)

  // Envolve em aspas se contém delimitador, aspas ou quebra de linha
  if (str.includes(delim) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Converte uma worksheet para string CSV com máxima fidelidade.
 * Usa sheet_to_json para garantir alinhamento de colunas mesmo em planilhas esparsas.
 */
const sheetToCsv = (sheet, delim, header) => {
  // sheet_to_json com header:1 retorna array de arrays (mantém ordem das colunas)
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,          // array de arrays
    raw: false,         // formata datas como strings
    defval: '',         // células vazias viram string vazia
    blankrows: true,    // mantém linhas vazias (não perde estrutura)
  })

  if (rows.length === 0) return ''

  // Descobre o número máximo de colunas (planilhas esparsas podem ter rows de tamanhos diferentes)
  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0)

  const lines = rows.map(row => {
    // Garante que todas as linhas tenham o mesmo número de colunas
    const padded = Array.from({ length: maxCols }, (_, i) => row[i] ?? '')
    return padded.map(cell => formatCell(cell, delim)).join(delim)
  })

  // Pula a primeira linha (header) se --no-header foi passado
  return (header ? lines : lines.slice(1)).join('\n')
}

// ── Exportar ─────────────────────────────────────────────────────────────────

let exportedCount = 0

for (const sheetName of sheetsToExport) {
  const sheet = workbook.Sheets[sheetName]

  if (!sheet || !sheet['!ref']) {
    console.warn(`⚠️   Aba vazia ignorada: "${sheetName}"`)
    continue
  }

  const csv = sheetToCsv(sheet, delimiter, !noHeader)

  // Nome do arquivo: base_NomeAba.csv (sanitiza caracteres inválidos no nome)
  const safeName = sheetName.replace(/[\\/:*?"<>|]/g, '_')
  const outFileName = sheetsToExport.length === 1 && !sheetFilter
    ? `${baseName}.csv`
    : `${baseName}_${safeName}.csv`

  const outPath = path.join(resolvedOutDir, outFileName)

  fs.writeFileSync(outPath, '\uFEFF' + csv, 'utf8') // BOM UTF-8 para Excel abrir corretamente
  console.log(`✅  Exportado: ${outPath}  (${csv.split('\n').length} linhas)`)
  exportedCount++
}

if (exportedCount === 0) {
  console.error('❌  Nenhuma aba foi exportada.')
  process.exit(1)
}

console.log(`\n🎉  Concluído! ${exportedCount} arquivo(s) CSV gerado(s) em: ${resolvedOutDir}`)
