import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'

import plugin from '../src/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..', '..', '..')
const ARTIFACTS_DIR = join(HERE, '..', 'artifacts')

const PRETTIER_OPTIONS = {
  parser: 'typescript' as const,
  semi: false,
  singleQuote: true,
  arrowParens: 'avoid' as const,
  trailingComma: 'all' as const,
  printWidth: 80,
}

const CORPUS = [
  'examples/auth/src/main.ts',
  'examples/auth/src/view.ts',
  'examples/auth/src/page/loggedOut/view.ts',
  'examples/auth/src/page/loggedOut/page/login.ts',
  'packages/typing-game/client/src/main.ts',
  'packages/typing-game/client/src/view/view.ts',
  'packages/typing-game/client/src/page/room/view/view.ts',
  'packages/typing-game/client/src/page/room/view/playing.ts',
  'packages/typing-game/client/src/page/room/view/finished.ts',
  'packages/typing-game/client/src/page/room/view/waiting.ts',
  'packages/typing-game/client/src/page/home/view.ts',
  'packages/website/src/page/landing.ts',
  'packages/website/src/page/gettingStarted.ts',
  'packages/website/src/page/manifesto.ts',
]

const safeName = (rel: string) => rel.replace(/[\\/]/g, '__')

const lineCount = (s: string) => s.split('\n').length

const maxIndentDepth = (s: string) => {
  let max = 0
  for (const line of s.split('\n')) {
    const m = line.match(/^( +)/)
    if (m === null) {
      continue
    }
    const cols = m[1]!.length
    if (cols > max) {
      max = cols
    }
  }
  return max
}

const fmtBaseline = (src: string, filepath: string) =>
  prettier.format(src, { ...PRETTIER_OPTIONS, filepath })

const fmtPlugin = (src: string, filepath: string) =>
  prettier.format(src, {
    ...PRETTIER_OPTIONS,
    filepath,
    plugins: [plugin],
  })

const ensureDir = (path: string) =>
  mkdirSync(dirname(path), { recursive: true })

interface Row {
  readonly file: string
  readonly beforeLines: number
  readonly afterLines: number
  readonly beforeMaxIndent: number
  readonly afterMaxIndent: number
  readonly idempotent: boolean
}

const main = async (): Promise<void> => {
  const rows: Row[] = []
  for (const rel of CORPUS) {
    const abs = join(REPO_ROOT, rel)
    let src: string
    try {
      src = readFileSync(abs, 'utf8')
    } catch (e) {
      console.warn(`skip ${rel}: ${(e as Error).message}`)
      continue
    }
    const before = await fmtBaseline(src, abs)
    const after = await fmtPlugin(src, abs)
    let idempotent = false
    try {
      const after2 = await fmtPlugin(after, abs)
      idempotent = after2 === after
    } catch {
      idempotent = false
    }

    const stem = safeName(rel)
    const beforePath = join(ARTIFACTS_DIR, `${stem}.before.txt`)
    const afterPath = join(ARTIFACTS_DIR, `${stem}.after.txt`)
    ensureDir(beforePath)
    writeFileSync(beforePath, before, 'utf8')
    writeFileSync(afterPath, after, 'utf8')

    rows.push({
      file: rel,
      beforeLines: lineCount(before),
      afterLines: lineCount(after),
      beforeMaxIndent: maxIndentDepth(before),
      afterMaxIndent: maxIndentDepth(after),
      idempotent,
    })
  }

  const lines: string[] = []
  lines.push('# Plugin output summary')
  lines.push('')
  lines.push(
    'Each row is one corpus file. Lines = total newlines in the formatted output. Max indent = the largest leading-space prefix found on any line, in spaces.',
  )
  lines.push('')
  lines.push(
    '| file | baseline lines | plugin lines | Δ lines | baseline max indent | plugin max indent | Δ indent | idempotent |',
  )
  lines.push('|---|---:|---:|---:|---:|---:|---:|:---:|')
  for (const r of rows) {
    lines.push(
      `| ${r.file} | ${r.beforeLines} | ${r.afterLines} | ${r.afterLines - r.beforeLines} | ${r.beforeMaxIndent} | ${r.afterMaxIndent} | ${r.afterMaxIndent - r.beforeMaxIndent} | ${r.idempotent ? 'yes' : 'NO'} |`,
    )
  }

  const totalBefore = rows.reduce((s, r) => s + r.beforeLines, 0)
  const totalAfter = rows.reduce((s, r) => s + r.afterLines, 0)
  lines.push('')
  lines.push(
    `Totals: baseline ${totalBefore} lines, plugin ${totalAfter} lines, Δ ${totalAfter - totalBefore} lines (${(((totalAfter - totalBefore) / totalBefore) * 100).toFixed(1)}%).`,
  )
  const summaryPath = join(ARTIFACTS_DIR, 'summary.md')
  writeFileSync(summaryPath, lines.join('\n') + '\n', 'utf8')
  console.log(
    `Wrote ${rows.length} pairs + summary to ${relative(REPO_ROOT, ARTIFACTS_DIR)}`,
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
