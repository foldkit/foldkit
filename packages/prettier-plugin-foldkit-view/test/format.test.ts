import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import prettier from 'prettier'
import { describe, expect, it } from 'vitest'

import plugin from '../src/index.js'

const PRETTIER_OPTIONS = {
  parser: 'typescript' as const,
  semi: false,
  singleQuote: true,
  arrowParens: 'avoid' as const,
  trailingComma: 'all' as const,
  printWidth: 80,
  plugins: [plugin],
}

const fmt = (src: string, filepath?: string) =>
  prettier.format(src, { ...PRETTIER_OPTIONS, filepath })

const REPO_ROOT = join(__dirname, '..', '..', '..')

const corpus = [
  'examples/auth/src/main.ts',
  'examples/auth/src/view.ts',
  'packages/typing-game/client/src/main.ts',
  'packages/typing-game/client/src/view/view.ts',
  'packages/typing-game/client/src/page/room/view/view.ts',
  'packages/typing-game/client/src/page/room/view/playing.ts',
  'packages/typing-game/client/src/page/room/view/finished.ts',
  'packages/typing-game/client/src/page/room/view/waiting.ts',
  'packages/typing-game/client/src/page/room/view/getReady.ts',
  'packages/typing-game/client/src/page/room/view/countdown.ts',
  'packages/website/src/page/landing.ts',
  'packages/website/src/page/gettingStarted.ts',
  'packages/website/src/page/manifesto.ts',
]

describe('hugged formatting', () => {
  it('formats short arrays inline', async () => {
    const out = await fmt('const a = [1, 2, 3]\n')
    expect(out).toBe('const a = [1, 2, 3]\n')
  })

  it('hugs and leads commas on broken arrays', async () => {
    const out = await fmt(
      'const a = [aaaaaaaaaaaaaa, bbbbbbbbbbbbbb, cccccccccccccc, dddddddddddddd, eeeeeeeeeeeeee]\n',
    )
    expect(out).toBe(
      'const a = [ aaaaaaaaaaaaaa\n, bbbbbbbbbbbbbb\n, cccccccccccccc\n, dddddddddddddd\n, eeeeeeeeeeeeee\n]\n',
    )
  })

  it('keeps short calls inline', async () => {
    const out = await fmt('foo(1, 2, 3)\n')
    expect(out).toBe('foo(1, 2, 3)\n')
  })

  it('hugs broken calls with leading commas', async () => {
    const out = await fmt(
      'foo(aaaaaaaaaaaaaa, bbbbbbbbbbbbbb, cccccccccccccc, dddddddddddddd, eeeeeeeeeeeeee, ffffffffffffff)\n',
    )
    expect(out).toBe(
      'foo( aaaaaaaaaaaaaa\n, bbbbbbbbbbbbbb\n, cccccccccccccc\n, dddddddddddddd\n, eeeeeeeeeeeeee\n, ffffffffffffff\n)\n',
    )
  })

  it('hugs broken object literals with leading commas, preserving inner spaces in flat mode', async () => {
    const flat = await fmt('const x = { a: 1, b: 2, c: 3 }\n')
    expect(flat).toBe('const x = { a: 1, b: 2, c: 3 }\n')

    const broken = await fmt(
      'const x = { aaaaaa: 11111, bbbbbb: 22222, cccccc: 33333, dddddd: 44444, eeeeee: 55555 }\n',
    )
    expect(broken).toBe(
      'const x = { aaaaaa: 11111\n, bbbbbb: 22222\n, cccccc: 33333\n, dddddd: 44444\n, eeeeee: 55555\n}\n',
    )
  })

  it('preserves arrow body parens around object literals', async () => {
    const out = await fmt('const f = (m) => ({ a: 1, b: 2 })\n')
    expect(out).toBe('const f = m => ({ a: 1, b: 2 })\n')
  })

  it('preserves expression-statement parens around object literals', async () => {
    const out = await fmt('({ a: 1 })\n')
    expect(out).toContain('({')
  })

  it('falls back to original formatting for sparse arrays', async () => {
    const out = await fmt('const a = [1, , 3]\n')
    expect(out).toBe('const a = [1, , 3]\n')
  })

  it('falls back for new-expression callee that is itself a call', async () => {
    const out = await fmt('new (foo())()\n')
    expect(out).toContain('new (foo())()')
  })

  it('preserves spread elements in arrays', async () => {
    const out = await fmt('const a = [1, ...rest, 3]\n')
    expect(out).toBe('const a = [1, ...rest, 3]\n')
  })

  it('preserves spread arguments in calls', async () => {
    const out = await fmt('foo(1, ...rest, 3)\n')
    expect(out).toBe('foo(1, ...rest, 3)\n')
  })

  it('keeps the comments fixture parseable and idempotent', async () => {
    const src = readFileSync(join(__dirname, 'fixtures', 'comments.ts'), 'utf8')
    const once = await fmt(src, 'fixtures/comments.ts')
    expect(once).toBeTypeOf('string')

    const twice = await fmt(once, 'fixtures/comments.ts')
    expect(twice).toBe(once)

    expect(once).toContain('// Top-level comment.')
    expect(once).toContain('/* between */')
    expect(once).toContain('// own-line leading')
    expect(once).toContain('/* trailing on element */')
    expect(once).toContain('/* dangling */')
    expect(once).toContain('// attributes')
    expect(once).toContain('/* between attributes */')
  })
})

describe('idempotency', () => {
  for (const rel of corpus) {
    it(`is idempotent on ${rel}`, async () => {
      const abs = join(REPO_ROOT, rel)
      const src = readFileSync(abs, 'utf8')
      const once = await fmt(src, abs)
      const twice = await fmt(once, abs)
      expect(twice).toBe(once)
    })
  }
})

// Custom plugin options aren't part of Prettier's exported Options type. We
// hand `prettier.format` an object that *does* include them; the easiest way
// to satisfy the type system without an assertion is to pass the merged
// options as a plain `Record`.
const fmtWithRawOptions = (
  src: string,
  extra: Readonly<Record<string, unknown>>,
) => {
  const merged: Record<string, unknown> = { ...PRETTIER_OPTIONS, ...extra }
  return prettier.format(src, merged)
}

describe('opt-out', () => {
  it('respects foldkitViewArrays=off', async () => {
    const out = await fmt('const a = [1, 2, 3]\n')
    const withOptOut = await fmtWithRawOptions('const a = [1, 2, 3]\n', {
      foldkitViewArrays: 'off',
    })
    expect(out).toBe('const a = [1, 2, 3]\n')
    expect(withOptOut).toBe('const a = [1, 2, 3]\n')
  })

  it('respects foldkitViewCallScope=allowlist', async () => {
    const restricted = await fmtWithRawOptions(
      'fooooooooooo(aaaaaaaaaaaa, bbbbbbbbbbbb, cccccccccccc, dddddddddddd, eeeeeeeeeeee)\n',
      {
        foldkitViewCallScope: 'allowlist',
        foldkitViewCallees: 'div,span,foo',
      },
    )
    expect(restricted).not.toContain('fooooooooooo( aaaaaaaaaaaa\n, ')
  })
})
