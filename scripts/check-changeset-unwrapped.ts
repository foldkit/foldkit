import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const BASE_REF = process.argv[2] ?? 'origin/main'
const FRONTMATTER_DELIMITER = '---'
const CODE_FENCE = '```'
const LIST_ITEM_PATTERN = /^([-*+]|\d+\.)\s/
const BLOCK_STARTER_PATTERN = /^[#>|]/

interface WrappedLine {
  readonly file: string
  readonly lineNumber: number
  readonly text: string
}

const resolveBaseRef = (): void => {
  try {
    execFileSync('git', ['rev-parse', '--verify', BASE_REF], {
      stdio: 'ignore',
    })
  } catch {
    console.error(`Could not resolve ${BASE_REF}. Fetch main and try again.`)
    process.exit(1)
  }
}

const changedChangesetFiles = (): ReadonlyArray<string> => {
  const output = execFileSync(
    'git',
    [
      'diff',
      '--diff-filter=AM',
      '--name-only',
      BASE_REF,
      'HEAD',
      '--',
      '.changeset',
    ],
    { encoding: 'utf8' },
  )
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.endsWith('.md') && !line.endsWith('/README.md'))
}

const findWrappedParagraphs = (
  file: string,
  content: string,
): ReadonlyArray<WrappedLine> => {
  const lines = content.split(/\r?\n/)
  const wrapped: Array<WrappedLine> = []

  let inFrontmatter = false
  let inCodeFence = false
  let previousLineContinues = false
  let paragraphAlreadyFlagged = false

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const start = line.trimStart()

    if (index === 0 && trimmed === FRONTMATTER_DELIMITER) {
      inFrontmatter = true
      return
    }

    if (inFrontmatter) {
      if (trimmed === FRONTMATTER_DELIMITER) {
        inFrontmatter = false
      }
      return
    }

    if (start.startsWith(CODE_FENCE)) {
      inCodeFence = !inCodeFence
      previousLineContinues = false
      paragraphAlreadyFlagged = false
      return
    }

    if (
      inCodeFence ||
      trimmed.length === 0 ||
      BLOCK_STARTER_PATTERN.test(start)
    ) {
      previousLineContinues = false
      paragraphAlreadyFlagged = false
      return
    }

    if (LIST_ITEM_PATTERN.test(start)) {
      previousLineContinues = true
      paragraphAlreadyFlagged = false
      return
    }

    if (previousLineContinues && !paragraphAlreadyFlagged) {
      wrapped.push({ file, lineNumber: index + 1, text: line })
      paragraphAlreadyFlagged = true
    }
    previousLineContinues = true
  })

  return wrapped
}

resolveBaseRef()

const changesetFiles = changedChangesetFiles()

const violations = changesetFiles.flatMap(file =>
  findWrappedParagraphs(file, readFileSync(file, 'utf8')),
)

if (violations.length > 0) {
  console.error('')
  console.error(
    'Changeset summaries must keep each paragraph on a single line.',
  )
  console.error(
    'The Version Packages PR body and release notes render newlines as breaks,',
  )
  console.error(
    'so a wrapped paragraph reads jagged. Lists, fenced code blocks, and',
  )
  console.error('blank-line-separated paragraphs are fine.')

  for (const violation of violations) {
    console.error('')
    console.error(violation.file)
    console.error(`  line ${violation.lineNumber}: wraps the paragraph above`)
    console.error(`  ${violation.text}`)
  }

  console.error('')
  console.error('Join each wrapped paragraph onto one line before committing.')
  process.exit(1)
}

const fileLabel = changesetFiles.length === 1 ? 'changeset' : 'changesets'
console.log(
  `Changeset summaries OK: ${changesetFiles.length} ${fileLabel} checked against ${BASE_REF}.`,
)
