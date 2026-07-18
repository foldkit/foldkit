import { describe, expect, it } from 'vitest'

import { transformBranchKeys } from '../src/branchKeys.ts'

const MODULE_ID = '/project/src/View.ts'
const PROJECT_ROOT = '/project'

const moduleSource = (body: string): string =>
  `import { html } from 'foldkit/html'\nconst h = html()\n${body}`

const transform = (source: string) =>
  transformBranchKeys(source, MODULE_ID, PROJECT_ROOT)

const transformedCode = (source: string): string => {
  const result = transform(source)
  expect(result).not.toBeNull()
  return result?.code ?? ''
}

const injectedKeys = (code: string): Array<string> =>
  [...code.matchAll(/\.Key\('(fk-[^']+)'\)/g)].map(match => match.at(1) ?? '')

describe('transformBranchKeys', () => {
  it('injects distinct keys into both ternary arms, before existing attributes', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) =>
  model.isOpen
    ? h.div([h.Class('open')], ['open'])
    : h.div([h.Class('closed')], ['closed'])`,
      ),
    )

    const keys = injectedKeys(code)
    expect(keys).toHaveLength(2)
    expect(new Set(keys).size).toBe(2)
    expect(code).toMatch(
      /h\.div\(\[h\.Key\('fk-[a-z0-9]+-0'\), h\.Class\('open'\)\]/,
    )
    expect(code).toMatch(
      /h\.div\(\[h\.Key\('fk-[a-z0-9]+-1'\), h\.Class\('closed'\)\]/,
    )
  })

  it('keys only the element arm when the other arm is h.empty or null', () => {
    const emptyArmCode = transformedCode(
      moduleSource(
        `const view = (model) => (model.isOpen ? h.div([], ['open']) : h.empty)`,
      ),
    )
    expect(injectedKeys(emptyArmCode)).toHaveLength(1)
    expect(emptyArmCode).toContain("h.div([h.Key('fk-")

    const nullArmCode = transformedCode(
      moduleSource(
        `const view = (model) => (model.isOpen ? h.div([], ['open']) : null)`,
      ),
    )
    expect(injectedKeys(nullArmCode)).toHaveLength(1)
  })

  it('keys elements inside conditional-insert singleton arrays', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) =>
  h.div(
    [],
    [h.p([], ['static']), ...(model.isOpen ? [h.section([], ['banner'])] : [])],
  )`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(1)
    expect(code).toContain("h.section([h.Key('fk-")
    expect(code).not.toContain('h.p([h.Key(')
    expect(code).not.toContain('h.div([h.Key(')
  })

  it('keys if/else chain returns', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) => {
  if (model.route._tag === 'Home') {
    return h.div([], ['home'])
  } else {
    return h.section([], ['other'])
  }
}`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(2)
    expect(code).toContain("h.div([h.Key('fk-")
    expect(code).toContain("h.section([h.Key('fk-")
  })

  it('keys early returns and the fall-through return', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) => {
  if (model.isLoading) return h.p([], ['loading'])
  return h.main([], ['content'])
}`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(2)
    expect(code).toContain("h.p([h.Key('fk-")
    expect(code).toContain("h.main([h.Key('fk-")
  })

  it('does not key a lone return without branching', () => {
    const result = transform(
      moduleSource(
        `const view = (model) => {
  return h.div([], ['always'])
}`,
      ),
    )

    expect(result).toBeNull()
  })

  it('keys M.tagsExhaustive object handler arms', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) =>
  M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => h.div([], ['home']),
      About: () => h.section([], ['about']),
    }),
  )`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(2)
    expect(code).toContain("h.div([h.Key('fk-")
    expect(code).toContain("h.section([h.Key('fk-")
  })

  it('keys positional handler results for Match.when, M.tag, and M.orElse', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) =>
  Match.value(model.state).pipe(
    Match.when({ _tag: 'Loading' }, () => h.p([], ['loading'])),
    M.tag('Ready', () => h.main([], ['ready'])),
    M.orElse(() => h.div([], ['idle'])),
  )`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(3)
    expect(code).toContain("h.p([h.Key('fk-")
    expect(code).toContain("h.main([h.Key('fk-")
    expect(code).toContain("h.div([h.Key('fk-")
  })

  it('keys Option.match handler results in data-first and data-last form', () => {
    const dataFirstCode = transformedCode(
      moduleSource(
        `const view = (model) =>
  Option.match(model.maybeUser, {
    onNone: () => h.p([], ['anonymous']),
    onSome: (user) => h.div([], [user.name]),
  })`,
      ),
    )
    expect(injectedKeys(dataFirstCode)).toHaveLength(2)

    const dataLastCode = transformedCode(
      moduleSource(
        `const view = (model) =>
  pipe(
    model.maybeUser,
    Option.match({
      onNone: () => h.p([], ['anonymous']),
      onSome: (user) => h.div([], [user.name]),
    }),
  )`,
      ),
    )
    expect(injectedKeys(dataLastCode)).toHaveLength(2)
  })

  it('keys Array.match onEmpty and onNonEmpty results but not mapped rows', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) =>
  Array.match(model.items, {
    onEmpty: () => h.p([], ['none']),
    onNonEmpty: (items) => h.ul([], items.map((item) => h.li([], [item.label]))),
  })`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(2)
    expect(code).toContain("h.p([h.Key('fk-")
    expect(code).toContain("h.ul([h.Key('fk-")
    expect(code).not.toContain('h.li([h.Key(')
  })

  it('leaves arms with an explicit h.Key untouched', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) =>
  model.isOpen
    ? h.div([h.Key('custom'), h.Class('open')], ['open'])
    : h.div([], ['closed'])`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(1)
    expect(code).toContain("h.div([h.Key('custom'), h.Class('open')]")
  })

  it('leaves h.keyed arms untouched', () => {
    const result = transform(
      moduleSource(
        `const view = (model) =>
  model.isOpen ? h.keyed('div')('open', [], ['open']) : h.empty`,
      ),
    )

    expect(result).toBeNull()
  })

  it('leaves delegated arms untouched', () => {
    const result = transform(
      moduleSource(
        `const view = (model) =>
  M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      About: () => aboutView(model),
    }),
  )`,
      ),
    )

    expect(result).toBeNull()
  })

  it('leaves a plain mapped list untouched', () => {
    const result = transform(
      moduleSource(
        `const view = (model) =>
  h.ul([], model.items.map((item) => h.li([], [item.label])))`,
      ),
    )

    expect(result).toBeNull()
  })

  it('does not key a ternary that is the direct body of a map callback', () => {
    const methodMapResult = transform(
      moduleSource(
        `const view = (model) =>
  h.ul(
    [],
    model.items.map((item) =>
      item.isActive ? h.li([h.Class('active')], [item.label]) : h.li([], [item.label]),
    ),
  )`,
      ),
    )
    expect(methodMapResult).toBeNull()

    const namespaceMapResult = transform(
      moduleSource(
        `const view = (model) =>
  h.ul(
    [],
    Array.map(model.items, (item) =>
      item.isActive ? h.li([h.Class('active')], [item.label]) : h.li([], [item.label]),
    ),
  )`,
      ),
    )
    expect(namespaceMapResult).toBeNull()
  })

  it('does not key a ternary that is the direct body of an Array.makeBy callback', () => {
    const result = transform(
      moduleSource(
        `const view = (model) =>
  h.ul(
    [],
    Array.makeBy(model.cellCount, (cellIndex) =>
      cellIndex === model.activeIndex ? h.li([h.Class('active')], []) : h.li([], []),
    ),
  )`,
      ),
    )

    expect(result).toBeNull()
  })

  it('keys a ternary nested inside an element call inside a map callback', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) =>
  h.ul(
    [],
    model.items.map((item) =>
      h.li([], [item.isActive ? h.strong([], [item.label]) : h.span([], [item.label])]),
    ),
  )`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(2)
    expect(code).toContain("h.strong([h.Key('fk-")
    expect(code).toContain("h.span([h.Key('fk-")
    expect(code).not.toContain('h.li([h.Key(')
  })

  it('keys arms inside single-value map callbacks', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model) =>
  pipe(
    model.maybeProfile,
    Option.map((profile) =>
      Option.match(profile.maybeAvatar, {
        onNone: () => (profile.isBusy ? h.span([], ['busy']) : h.em([], ['idle'])),
        onSome: (avatar) => h.img([h.Src(avatar.url)]),
      }),
    ),
    Option.getOrElse(() => h.empty),
  )`,
      ),
    )

    expect(injectedKeys(code)).toHaveLength(3)
    expect(code).toContain("h.span([h.Key('fk-")
    expect(code).toContain("h.em([h.Key('fk-")
    expect(code).toContain("h.img([h.Key('fk-")
  })

  it('returns null for modules without a foldkit/html import', () => {
    const result = transform(
      `import { html } from 'other-library'
const h = html()
const view = (model) => (model.isOpen ? h.div([], ['open']) : h.empty)`,
    )

    expect(result).toBeNull()
  })

  it('wraps a non-array attributes argument in a spread array', () => {
    const code = transformedCode(
      moduleSource(
        `const view = (model, attributes) =>
  model.isOpen ? h.div(attributes, ['open']) : h.empty`,
      ),
    )

    expect(code).toMatch(
      /h\.div\(\[h\.Key\('fk-[a-z0-9]+-0'\), \.\.\.\(attributes\)\], \['open'\]\)/,
    )
  })

  it('rewrites a zero-argument arm call to a keyed attributes array', () => {
    const code = transformedCode(
      moduleSource(`const view = (model) => (model.isOpen ? h.br() : h.empty)`),
    )

    expect(code).toMatch(/h\.br\(\[h\.Key\('fk-[a-z0-9]+-0'\)\]\)/)
  })

  it('skips arms whose first argument is a spread element', () => {
    const result = transform(
      moduleSource(
        `const view = (model, attributes) =>
  model.isOpen ? h.div(...attributes) : h.empty`,
      ),
    )

    expect(result).toBeNull()
  })

  it('produces deterministic output with path-dependent hashes', () => {
    const source = moduleSource(
      `const view = (model) => (model.isOpen ? h.div([], ['open']) : h.span([], ['closed']))`,
    )

    const firstRun = transform(source)
    const secondRun = transform(source)
    expect(firstRun?.code).toBe(secondRun?.code)

    const otherPathRun = transformBranchKeys(
      source,
      '/project/src/Other.ts',
      PROJECT_ROOT,
    )
    const firstRunKeys = injectedKeys(firstRun?.code ?? '')
    const otherPathKeys = injectedKeys(otherPathRun?.code ?? '')
    expect(firstRunKeys).toHaveLength(2)
    expect(otherPathKeys).toHaveLength(2)
    expect(firstRunKeys.at(0)).not.toBe(otherPathKeys.at(0))
  })

  it('returns a source map', () => {
    const result = transform(
      moduleSource(
        `const view = (model) => (model.isOpen ? h.div([], ['open']) : h.empty)`,
      ),
    )

    expect(result).not.toBeNull()
    expect(typeof result?.map.mappings).toBe('string')
    expect(result?.map.mappings.length).toBeGreaterThan(0)
  })

  it('uses the actual factory binding name in injected keys', () => {
    const code = transformBranchKeys(
      `import { html as makeHtml } from 'foldkit/html'
const factory = makeHtml()
const view = (model) =>
  model.isOpen ? factory.div([], ['open']) : factory.section([], ['closed'])`,
      MODULE_ID,
      PROJECT_ROOT,
    )?.code

    expect(code).toContain("factory.div([factory.Key('fk-")
    expect(code).toContain("factory.section([factory.Key('fk-")
  })
})
