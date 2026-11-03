import fs from 'node:fs'
import path from 'node:path'
import config from '../../capacitor.config'

// Regras dos workflows que mexem com chave de loja (keystore Android, chave da Apple,
// senha do match) e com a cota do Actions da conta uzzaidev. Mesmas regras do UzzOPS
// (tests/mobile/ci-mobile-hardening.test.ts), trazidas para o UzzApp em 03/11/2026.
const WORKFLOWS_DIR = path.join(process.cwd(), '.github/workflows')
const workflows = fs
  .readdirSync(WORKFLOWS_DIR)
  .filter((f) => f.endsWith('.yml'))
  .map((f) => ({ nome: f, texto: fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8') }))

describe('workflows do GitHub Actions', () => {
  it('fixam toda action por SHA de commit (tag pode ser trocada por quem controla a action)', () => {
    const soltas = workflows.flatMap(({ nome, texto }) =>
      [...texto.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)]
        .map((m) => m[1])
        .filter((uso) => !/@[0-9a-f]{40}$/.test(uso))
        .map((uso) => `${nome}: ${uso}`),
    )
    expect(soltas).toEqual([])
  })

  it('declaram permissions no topo (token do GitHub só com o que precisa)', () => {
    const semPermissao = workflows.filter(({ texto }) => !/^permissions:/m.test(texto)).map((w) => w.nome)
    expect(semPermissao).toEqual([])
  })

  it('só usam secret em linha de env, nunca colado dentro de script', () => {
    const coladas = workflows.flatMap(({ nome, texto }) =>
      texto
        .split('\n')
        .filter((linha) => linha.includes('${{ secrets.'))
        .filter((linha) => !/^\s+[A-Z0-9_]+:\s*\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}\s*$/.test(linha))
        .map((linha) => `${nome}: ${linha.trim()}`),
    )
    expect(coladas).toEqual([])
  })

  it('não interpolam input do workflow dentro de script (vai por env)', () => {
    const interpolados = workflows.flatMap(({ nome, texto }) =>
      texto
        .split('\n')
        .filter((linha) => linha.includes('${{ github.event.inputs.'))
        .filter((linha) => !/^\s+[A-Z0-9_]+:\s*\$\{\{\s*github\.event\.inputs\.[a-z0-9_]+\s*\}\}\s*$/.test(linha))
        .map((linha) => `${nome}: ${linha.trim()}`),
    )
    expect(interpolados).toEqual([])
  })

  it('todo job tem timeout-minutes (macOS travado sem limite queima a cota da conta)', () => {
    const semTimeout = workflows
      .filter(({ texto }) => (texto.match(/^\s+runs-on:/gm) ?? []).length > (texto.match(/^\s+timeout-minutes:/gm) ?? []).length)
      .map((w) => w.nome)
    expect(semTimeout).toEqual([])
  })
})

describe('capacitor.config', () => {
  it('não força a depuração da WebView (o padrão do Capacitor só liga no build de debug)', () => {
    expect(config.android?.webContentsDebuggingEnabled).toBeUndefined()
  })

  it('deixa CapacitorCookies e CapacitorHttp desligados (trocam o cookie do login pelo jar nativo)', () => {
    expect(config.plugins?.CapacitorCookies?.enabled).toBe(false)
    expect(config.plugins?.CapacitorHttp?.enabled).toBe(false)
  })
})
