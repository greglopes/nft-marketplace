/**
 * Runs Lighthouse (mobile + desktop) three times against the home and the NFT
 * detail served from the production build (`vite preview`), reports the median
 * of each category and stores HTML/JSON reports in lighthouse/reports/.
 *
 * Usage: npm run lighthouse            (builds, starts preview on :4175)
 *        LH_URL=https://... npm run lighthouse   (audits a deployed URL)
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { desktopConfig, mobileConfig } from '../lighthouse/config.js'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'lighthouse/reports')
mkdirSync(OUT, { recursive: true })

const RUNS = Number(process.env.LH_RUNS ?? 3)
const PORT = 4175
const BASE = process.env.LH_URL ?? `http://localhost:${PORT}`
const PAGES = [
  { id: 'home', path: '/' },
  { id: 'detail', path: '/nft/nft-01' },
]
const PRESETS = [
  { id: 'mobile', config: mobileConfig },
  { id: 'desktop', config: desktopConfig },
]

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', ...opts })
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} ${args.join(' ')} exited ${code}`))))
  })
}

async function waitFor(url, ms = 30_000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Server at ${url} did not start`)
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

async function main() {
  let preview
  if (!process.env.LH_URL) {
    await run('npx', ['vite', 'build'])
    preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' })
    await waitFor(BASE)
  }
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] })
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    runsPerPage: RUNS,
    versions: {
      lighthouse: require('lighthouse/package.json').version,
      node: process.version,
      chrome: chrome.process?.spawnargs?.[0] ?? 'chrome-launcher default',
      os: `${os.platform()} ${os.release()} (${os.arch()})`,
      cpu: os.cpus()[0]?.model,
    },
    results: [],
  }
  try {
    for (const page of PAGES) {
      for (const preset of PRESETS) {
        const scores = { performance: [], accessibility: [], 'best-practices': [], seo: [] }
        const metrics = { lcp: [], cls: [], tbt: [], fcp: [], si: [] }
        for (let i = 1; i <= RUNS; i++) {
          const url = `${BASE}${page.path}`
          const result = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, preset.config)
          const lhr = result.lhr
          for (const cat of Object.keys(scores)) scores[cat].push(Math.round((lhr.categories[cat]?.score ?? 0) * 100))
          metrics.lcp.push(lhr.audits['largest-contentful-paint'].numericValue)
          metrics.cls.push(lhr.audits['cumulative-layout-shift'].numericValue)
          metrics.tbt.push(lhr.audits['total-blocking-time'].numericValue)
          metrics.fcp.push(lhr.audits['first-contentful-paint'].numericValue)
          metrics.si.push(lhr.audits['speed-index'].numericValue)
          const base = `${page.id}-${preset.id}-run${i}`
          writeFileSync(resolve(OUT, `${base}.html`), result.report[0])
          writeFileSync(resolve(OUT, `${base}.json`), result.report[1])
          console.log(`${base}: perf ${scores.performance.at(-1)} a11y ${scores.accessibility.at(-1)} bp ${scores['best-practices'].at(-1)} seo ${scores.seo.at(-1)}`)
        }
        summary.results.push({
          page: page.id,
          url: `${BASE}${page.path}`,
          preset: preset.id,
          median: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, median(v)])),
          runs: scores,
          metricsMedian: { lcpMs: Math.round(median(metrics.lcp)), cls: Number(median(metrics.cls).toFixed(3)), tbtMs: Math.round(median(metrics.tbt)), fcpMs: Math.round(median(metrics.fcp)), speedIndexMs: Math.round(median(metrics.si)) },
        })
      }
    }
  } finally {
    await chrome.kill()
    preview?.kill()
  }
  writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
  const lines = [
    `# Lighthouse — resumo (${summary.generatedAt})`,
    '',
    `Base: ${summary.baseUrl} · ${RUNS} medições por página/perfil · Lighthouse ${summary.versions.lighthouse} · Node ${summary.versions.node} · ${summary.versions.os}`,
    '',
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
    ...summary.results.map((r) => `| ${r.page} | ${r.preset} | ${r.median.performance} | ${r.median.accessibility} | ${r.median['best-practices']} | ${r.median.seo} | ${r.metricsMedian.lcpMs} | ${r.metricsMedian.cls} | ${r.metricsMedian.tbtMs} |`),
    '',
    'Medianas de 3 execuções. Relatórios completos: `lighthouse/reports/<página>-<perfil>-run<n>.{html,json}`.',
  ]
  writeFileSync(resolve(OUT, 'summary.md'), lines.join('\n') + '\n')
  console.log(readFileSync(resolve(OUT, 'summary.md'), 'utf8'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
