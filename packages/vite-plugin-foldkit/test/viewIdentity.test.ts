import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'

import { transformViewIdentity } from '../src/viewIdentity.ts'

const MODULE_ID = '/app/src/View.ts'
const ROOT = '/app'
const ALIAS = '__foldkitBrandViewResult'
const IMPORT_LINE = `import { brandViewResult as ${ALIAS} } from 'foldkit/brand'`

const requireTransform = (code: string, id: string = MODULE_ID) => {
  const result = transformViewIdentity(code, id, ROOT)
  expect(result).not.toBeNull()
  if (result === null) {
    throw new Error('expected a transform result')
  }
  return result
}

const countOccurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1

describe('function naming', () => {
  it('brands returns of a named function declaration', () => {
    const result = requireTransform(`function view() {
  return 1
}
`)
    expect(result.code).toContain(`return ${ALIAS}((1), "src/View.ts#view")`)
  })

  it('brands returns of a const arrow with a block body', () => {
    const result = requireTransform(`const view = () => {
  return 1
}
`)
    expect(result.code).toContain(`return ${ALIAS}((1), "src/View.ts#view")`)
  })

  it('wraps the body of an expression-body arrow', () => {
    const result = requireTransform(`const view = () => 1
`)
    expect(result.code).toContain(
      `const view = () => ${ALIAS}((1), "src/View.ts#view")`,
    )
  })

  it('names an object method by its key', () => {
    const result = requireTransform(`const views = {
  render() {
    return 1
  },
}
`)
    expect(result.code).toContain(`return ${ALIAS}((1), "src/View.ts#render")`)
  })

  it('names an object property arrow by its key', () => {
    const result = requireTransform(`const handlers = {
  Viewing: () => 1,
}
`)
    expect(result.code).toContain(
      `Viewing: () => ${ALIAS}((1), "src/View.ts#Viewing")`,
    )
  })

  it('names a class method by its key', () => {
    const result = requireTransform(`class Panel {
  render() {
    return 1
  }
}
`)
    expect(result.code).toContain(`return ${ALIAS}((1), "src/View.ts#render")`)
  })

  it('names an export-default function "default"', () => {
    const result = requireTransform(`export default function () {
  return 1
}
`)
    expect(result.code).toContain(`return ${ALIAS}((1), "src/View.ts#default")`)
  })

  it('names an export-default arrow "default"', () => {
    const result = requireTransform(`export default () => 1
`)
    expect(result.code).toContain(
      `export default () => ${ALIAS}((1), "src/View.ts#default")`,
    )
  })

  it('names a member assignment by its property', () => {
    const result = requireTransform(`const host = {}
host.render = function () {
  return 1
}
`)
    expect(result.code).toContain(`return ${ALIAS}((1), "src/View.ts#render")`)
  })

  it('falls back to "anonymous" for unnameable functions', () => {
    const result = requireTransform(`const views = [() => 1]
`)
    expect(result.code).toContain(`${ALIAS}((1), "src/View.ts#anonymous")`)
  })
})

describe('nested functions', () => {
  it('brands inner and outer functions with their own ids', () => {
    const result = requireTransform(`const outer = () => {
  const inner = () => 1
  return inner()
}
`)
    expect(result.code).toContain(
      `const inner = () => ${ALIAS}((1), "src/View.ts#inner")`,
    )
    expect(result.code).toContain(
      `return ${ALIAS}((inner()), "src/View.ts#outer")`,
    )
    expect(countOccurrences(result.code, `${ALIAS}((`)).toBe(2)
  })

  it('does not let an outer function wrap returns of a nested function', () => {
    const result = requireTransform(`function outer() {
  return function inner() {
    return 1
  }
}
`)
    expect(countOccurrences(result.code, '"src/View.ts#outer"')).toBe(1)
    expect(countOccurrences(result.code, '"src/View.ts#inner"')).toBe(1)
  })

  it('nests calls correctly when inner and outer targets share an end', () => {
    const result = requireTransform(`const outer = () => () => 1
`)
    expect(result.code).toContain(
      `${ALIAS}((() => ${ALIAS}((1), "src/View.ts#anonymous")), "src/View.ts#outer")`,
    )
    expect(() => parseAst(result.code)).not.toThrow()
  })
})

describe('duplicate names', () => {
  it('disambiguates duplicate names deterministically in source order', () => {
    const result = requireTransform(`const render = () => 1
const panel = { render: () => 2 }
`)
    expect(result.code).toContain(
      `const render = () => ${ALIAS}((1), "src/View.ts#render")`,
    )
    expect(result.code).toContain(
      `render: () => ${ALIAS}((2), "src/View.ts#render~2")`,
    )
  })
})

describe('returns and imports', () => {
  it('leaves bare return statements untouched', () => {
    expect(
      transformViewIdentity(
        `function run() {
  return
}
`,
        MODULE_ID,
        ROOT,
      ),
    ).toBeNull()
  })

  it('returns null for a module with no functions', () => {
    expect(
      transformViewIdentity('const value = 1\n', MODULE_ID, ROOT),
    ).toBeNull()
  })

  it('injects the brand import exactly once', () => {
    const result = requireTransform(`const first = () => 1
const second = () => 2
const third = () => 3
`)
    expect(result.code.startsWith(IMPORT_LINE)).toBe(true)
    expect(countOccurrences(result.code, "from 'foldkit/brand'")).toBe(1)
  })

  it('extends the alias with a numeric suffix on collision', () => {
    const result = requireTransform(`const ${ALIAS} = 1
const view = () => 2
`)
    expect(result.code).toContain(
      `import { brandViewResult as ${ALIAS}2 } from 'foldkit/brand'`,
    )
    expect(result.code).toContain(
      `const view = () => ${ALIAS}2((2), "src/View.ts#view")`,
    )
  })

  it('keeps a parenthesized object-body arrow syntactically valid', () => {
    const result = requireTransform(`const view = () => ({ label: 'x' })
`)
    expect(result.code).toContain(ALIAS)
    expect(() => parseAst(result.code)).not.toThrow()
  })
})

describe('eligibility', () => {
  const FUNCTION_SOURCE = 'const view = () => 1\n'

  it('skips a packages/foldkit path via the fallback when foldkit is unresolved', () => {
    expect(
      transformViewIdentity(
        FUNCTION_SOURCE,
        '/app/packages/foldkit/src/html/index.ts',
        ROOT,
      ),
    ).toBeNull()
  })

  it('brands a consumer module under packages/foldkit once foldkit resolves', () => {
    // Regression: with the installed foldkit package resolved, the plugin's
    // precise package-root gate is authoritative, so the coarse
    // `packages/foldkit/` fragment must not un-brand a consumer whose own app
    // path merely contains the segment.
    const result = transformViewIdentity(
      FUNCTION_SOURCE,
      '/work/app/packages/foldkit/View.ts',
      '/work/app',
      { isFoldkitCoreResolved: true },
    )
    expect(result).not.toBeNull()
    expect(result?.code).toContain('"packages/foldkit/View.ts#view"')
  })

  it('skips foldkit core under node_modules', () => {
    expect(
      transformViewIdentity(
        FUNCTION_SOURCE,
        '/app/node_modules/foldkit/dist/index.js',
        ROOT,
      ),
    ).toBeNull()
  })

  it('does not skip @foldkit/ui modules', () => {
    const result = requireTransform(
      FUNCTION_SOURCE,
      '/app/packages/ui/src/button/button.ts',
    )
    expect(result.code).toContain('"packages/ui/src/button/button.ts#view"')
  })

  it('skips virtual modules', () => {
    expect(
      transformViewIdentity(FUNCTION_SOURCE, '\0virtual:module', ROOT),
    ).toBeNull()
  })

  it('skips non-script extensions', () => {
    expect(
      transformViewIdentity(FUNCTION_SOURCE, '/app/src/styles.css', ROOT),
    ).toBeNull()
  })

  it('strips the query before checking the extension', () => {
    const result = requireTransform(FUNCTION_SOURCE, '/app/src/View.ts?v=123')
    expect(result.code).toContain('"src/View.ts#view"')
  })

  it('skips only whole node_modules path segments', () => {
    expect(
      transformViewIdentity(
        FUNCTION_SOURCE,
        '/app/node_modules/some-lib/view.ts',
        ROOT,
      ),
    ).toBeNull()

    const result = requireTransform(
      FUNCTION_SOURCE,
      '/app/src/node_modules-demo.ts',
    )
    expect(result.code).toContain('"src/node_modules-demo.ts#view"')
  })
})

describe('already-branded modules', () => {
  it('returns null when the module already imports foldkit/brand', () => {
    const brandedSource = `${IMPORT_LINE}
const view = () => ${ALIAS}((1), "src/View.ts#view")
`
    expect(transformViewIdentity(brandedSource, MODULE_ID, ROOT)).toBeNull()
  })

  it('recognizes a double-quoted foldkit/brand specifier', () => {
    const brandedSource = `import { brandViewResult } from "foldkit/brand"
const view = () => brandViewResult(1, "src/View.ts#view")
`
    expect(transformViewIdentity(brandedSource, MODULE_ID, ROOT)).toBeNull()
  })

  it('is idempotent: transforming its own output returns null', () => {
    const first = requireTransform('const view = () => 1\n')
    expect(transformViewIdentity(first.code, MODULE_ID, ROOT)).toBeNull()
  })

  it('skips a module that re-exports foldkit/brand', () => {
    const reexportSource = `export { brandViewResult } from 'foldkit/brand'
const view = () => 1
`
    expect(transformViewIdentity(reexportSource, MODULE_ID, ROOT)).toBeNull()
  })

  it('brands a module whose comment mentions foldkit/brand', () => {
    const result = requireTransform(`// see 'foldkit/brand' for details
const view = () => 1
`)
    expect(result.code).toContain(`${ALIAS}((1), "src/View.ts#view")`)
    expect(countOccurrences(result.code, "from 'foldkit/brand'")).toBe(1)
  })

  it('brands a module whose string literal mentions foldkit/brand', () => {
    const result = requireTransform(`const specifier = 'foldkit/brand'
const view = () => 1
`)
    expect(result.code).toContain(`${ALIAS}((1), "src/View.ts#view")`)
  })
})

describe('directive prologues', () => {
  it('keeps leading directives ahead of the injected import', () => {
    const result = requireTransform(`'use client'
'use strict'
const view = () => 1
`)
    const directiveIndex = result.code.indexOf(`'use client'`)
    const strictIndex = result.code.indexOf(`'use strict'`)
    const importIndex = result.code.indexOf(IMPORT_LINE)
    expect(directiveIndex).toBe(0)
    expect(strictIndex).toBeGreaterThan(directiveIndex)
    expect(importIndex).toBeGreaterThan(strictIndex)
    expect(countOccurrences(result.code, IMPORT_LINE)).toBe(1)
    expect(() => parseAst(result.code)).not.toThrow()
  })

  it('keeps a leading hashbang and its directives ahead of the injected import', () => {
    const result = requireTransform(`#!/usr/bin/env node
'use strict'
const view = () => 1
`)
    const hashbangIndex = result.code.indexOf('#!/usr/bin/env node')
    const strictIndex = result.code.indexOf(`'use strict'`)
    const importIndex = result.code.indexOf(IMPORT_LINE)
    expect(hashbangIndex).toBe(0)
    expect(strictIndex).toBeGreaterThan(hashbangIndex)
    expect(importIndex).toBeGreaterThan(strictIndex)
    expect(result.code).toContain(`${ALIAS}((1), "src/View.ts#view")`)
    expect(() => parseAst(result.code)).not.toThrow()
  })

  it('inserts after a hashbang when no directives follow', () => {
    const result = requireTransform(`#!/usr/bin/env node
const view = () => 1
`)
    const hashbangIndex = result.code.indexOf('#!/usr/bin/env node')
    const importIndex = result.code.indexOf(IMPORT_LINE)
    expect(hashbangIndex).toBe(0)
    expect(importIndex).toBeGreaterThan(hashbangIndex)
    expect(() => parseAst(result.code)).not.toThrow()
  })
})

describe('output stability', () => {
  it('produces identical output across runs', () => {
    const source = `const view = () => 1
const panel = () => {
  return 2
}
`
    const first = requireTransform(source)
    const second = requireTransform(source)
    expect(first.code).toBe(second.code)
  })

  it('produces a source map', () => {
    const result = requireTransform('const view = () => 1\n')
    expect(result.map.mappings.length).toBeGreaterThan(0)
  })
})
