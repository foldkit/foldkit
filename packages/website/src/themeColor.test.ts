import { Array, Option, String as String_, pipe } from 'effect'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const WEBSITE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

const readWebsiteFile = (relativePath: string): string =>
  readFileSync(join(WEBSITE_DIR, relativePath), 'utf8')

const hexFor = (source: string, pattern: RegExp): string =>
  pipe(
    String_.match(pattern)(source),
    Option.flatMap(match => Array.get(match, 1)),
    Option.getOrThrowWith(() => new Error(`No match for ${pattern}`)),
  )

// NOTE: theme-init.js runs before any stylesheet or module is available, so
// it cannot import the palette. These tests are what keep its literals, the
// ApplyTheme constants, and the index.html default bound to styles.css.
describe('theme-color', () => {
  const styles = readWebsiteFile('src/styles.css')
  const themeInit = readWebsiteFile('public/theme-init.js')
  const main = readWebsiteFile('src/main.ts')
  const indexHtml = readWebsiteFile('index.html')

  const creamHex = hexFor(styles, /--color-cream:\s*(#[0-9a-fA-F]{6})/)
  const gray900Hex = hexFor(styles, /--color-gray-900:\s*(#[0-9a-fA-F]{6})/)

  test('theme-init.js writes the palette backgrounds', () => {
    expect(themeInit).toContain(`'${creamHex}'`)
    expect(themeInit).toContain(`'${gray900Hex}'`)
  })

  test('the ApplyTheme constants match the palette backgrounds', () => {
    expect(hexFor(main, /LIGHT_THEME_COLOR = '(#[0-9a-fA-F]{6})'/)).toBe(
      creamHex,
    )
    expect(hexFor(main, /DARK_THEME_COLOR = '(#[0-9a-fA-F]{6})'/)).toBe(
      gray900Hex,
    )
  })

  test('index.html defaults to the light background', () => {
    expect(indexHtml).toContain(
      `<meta name="theme-color" content="${creamHex}" />`,
    )
  })
})
