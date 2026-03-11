#!/usr/bin/env node
/**
 * generate-pdf.js
 * Converte UZZAPP_FEATURES_CLIENTE.html → UZZAPP_FEATURES_CLIENTE.pdf
 * usando Puppeteer (Chromium headless) para renderização fiel.
 *
 * Uso:
 *   node generate-pdf.js
 *   node generate-pdf.js --input outro-arquivo.html --output saida.pdf
 */

const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

// ── Argumentos CLI simples ─────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : null
}

const inputFile  = getArg('--input')  || 'UZZAPP_FEATURES_CLIENTE.html'
const outputFile = getArg('--output') || inputFile.replace(/\.html$/i, '.pdf')

const inputPath  = path.resolve(__dirname, inputFile)
const outputPath = path.resolve(__dirname, outputFile)

// ── Validação ──────────────────────────────────────────────────────────────
if (!fs.existsSync(inputPath)) {
  console.error(`❌  Arquivo não encontrado: ${inputPath}`)
  process.exit(1)
}

// ── Geração do PDF ─────────────────────────────────────────────────────────
;(async () => {
  console.log(`📄  Input : ${inputPath}`)
  console.log(`📥  Output: ${outputPath}`)
  console.log('🚀  Abrindo navegador...')

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  })

  const page = await browser.newPage()

  // Emula viewport A4 em 96dpi
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })

  // Carrega o arquivo HTML local (file:// garante acesso a recursos locais)
  const fileUrl = `file:///${inputPath.replace(/\\/g, '/')}`
  console.log('🌐  Carregando página...')

  await page.goto(fileUrl, {
    waitUntil: 'networkidle0', // espera todos os recursos (fontes, CDN Lucide)
    timeout: 60_000,
  })

  // Aguarda os ícones Lucide serem inicializados no DOM
  await page.waitForFunction(
    () => document.querySelectorAll('svg[data-lucide]').length > 0,
    { timeout: 15_000 }
  ).catch(() => {
    console.warn('⚠️  Timeout aguardando ícones Lucide — continuando mesmo assim.')
  })

  // Pequeno delay extra para garantir que fontes web foram aplicadas
  await new Promise(r => setTimeout(r, 1500))

  console.log('🖨️  Gerando PDF...')

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,   // preserva backgrounds, gradientes e cores
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: false, // usa A4 do Puppeteer, não @page CSS
    displayHeaderFooter: false,
  })

  await browser.close()

  const stats = fs.statSync(outputPath)
  const kb = (stats.size / 1024).toFixed(1)
  console.log(`✅  PDF gerado com sucesso! (${kb} KB)`)
  console.log(`📂  ${outputPath}`)
})().catch(err => {
  console.error('❌  Erro ao gerar PDF:', err.message)
  process.exit(1)
})
