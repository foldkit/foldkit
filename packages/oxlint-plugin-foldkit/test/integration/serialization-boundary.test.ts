import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildPlugin } from './build-plugin.ts'
import { runOxlint } from './run-oxlint.ts'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const oxlintBin = join(
  pluginRoot,
  '..',
  '..',
  'node_modules',
  'oxlint',
  'bin',
  'oxlint',
)
const workDir = mkdtempSync(
  join(tmpdir(), 'foldkit-serialization-boundary-lint-'),
)
const bundlePath = join(workDir, 'plugin.mjs')
const rule = 'no-completed-block-model-in-schema'

beforeAll(async () => {
  await buildPlugin(bundlePath)
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const diagnosticsFor = (name: string, source: string) => {
  const sourcePath = join(workDir, `${name}.ts`)
  const configPath = join(workDir, `${name}.json`)
  writeFileSync(sourcePath, source)
  writeFileSync(
    configPath,
    JSON.stringify({
      plugins: ['typescript'],
      jsPlugins: [
        { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
      ],
      categories: { correctness: 'off' },
      rules: { [`foldkit/${rule}`]: 'error' },
    }),
  )
  const diagnostics = runOxlint({
    oxlintBin,
    cwd: workDir,
    configPath,
    target: sourcePath,
  })
  for (const diagnostic of diagnostics) {
    expect(diagnostic.code).toBe(`foldkit(${rule})`)
  }
  return diagnostics
}

const exactBoundary = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
const Model = Schema.Struct({ count: Schema.Number })
const Composition = Block.makeDefinition('Child', { Model, Message: Schema.Never }).makeComposition()
export const OtherComposition = Block.makeDefinition('Other', { Model, Message: Schema.Never }).makeComposition()
const init = Composition.makeInit(() => ({ model: Model.make({ count: 0 }) }))
const update = Composition.makeUpdate({})
const view = Composition.makeView((model, h) => h.div([], [String(model.count)]))
interface Implementation {
  readonly init: typeof init
  readonly update: typeof update
  readonly view: typeof view
}
const constructHeader = (): Block.AssemblyDraft<Block.CompletedWithView<typeof Composition, Implementation>> =>
  Composition.prepareBlock({ init, update, view } satisfies Implementation)
export const Child: Block.FromAssemblyWithView<typeof Model, typeof constructHeader> = Block.assemble(constructHeader)
`
const parent = `export const Parent = Schema.Struct({ child: Child.Model })`

const withExtractedCompositionFactory = (source: string) =>
  source.replace(
    "const Composition = Block.makeDefinition('Child', { Model, Message: Schema.Never }).makeComposition()",
    "const Definition = Block.makeDefinition('Child', { Model, Message: Schema.Never })\nconst { makeComposition: makeGraph } = Definition\nconst Composition = makeGraph()",
  )

const rejectedBoundaries = [
  [
    'any-return',
    exactBoundary.replace(
      'Block.AssemblyDraft<Block.CompletedWithView<typeof Composition, Implementation>>',
      'any',
    ),
  ],
  [
    'unknown-implementation',
    exactBoundary.replace(
      'readonly init: typeof init',
      'readonly init: unknown',
    ),
  ],
  [
    'optional-field',
    exactBoundary.replace(
      'readonly init: typeof init',
      'readonly init?: typeof init',
    ),
  ],
  [
    'mutable-field',
    exactBoundary.replace('readonly init: typeof init', 'init: typeof init'),
  ],
  [
    'wrong-composition',
    exactBoundary.replace(
      'WithView<typeof Composition, Implementation>',
      'WithView<typeof OtherComposition, Implementation>',
    ),
  ],
  [
    'wrong-value',
    exactBoundary.replace(
      '{ init, update, view } satisfies',
      '{ init: view, update, view } satisfies',
    ),
  ],
  [
    'missing-field',
    exactBoundary.replace(
      '{ init, update, view } satisfies',
      '{ view } satisfies',
    ),
  ],
  [
    'extra-field',
    exactBoundary.replace(
      '{ init, update, view } satisfies',
      '{ init, update, view, extra: init } satisfies',
    ),
  ],
  [
    'spread-field',
    exactBoundary.replace(
      '{ init, update, view } satisfies',
      '{ ...{ init, update, view } } satisfies',
    ),
  ],
  [
    'cast-implementation',
    exactBoundary.replace(
      '} satisfies Implementation)',
      '} as Implementation)',
    ),
  ],
  ['missing-satisfies', exactBoundary.replace(' satisfies Implementation', '')],
  [
    'different-satisfies',
    exactBoundary.replace(
      ' satisfies Implementation',
      ' satisfies OtherImplementation',
    ),
  ],
  [
    'merged-interface',
    exactBoundary +
      '\ninterface Implementation { readonly extra?: typeof init }',
  ],
  [
    'inherited-interface',
    exactBoundary.replace(
      'interface Implementation {',
      'interface Base {}\ninterface Implementation extends Base {',
    ),
  ],
  [
    'fake-draft',
    exactBoundary
      .replace(
        "import { Block } from 'foldkit'",
        "import { Block } from 'foldkit'\nimport type { AssemblyDraft } from './fake'",
      )
      .replace('Block.AssemblyDraft<', 'AssemblyDraft<'),
  ],
  [
    'fake-completed',
    exactBoundary
      .replace(
        "import { Block } from 'foldkit'",
        "import { Block } from 'foldkit'\nimport type { CompletedWithView } from './fake'",
      )
      .replace('Block.CompletedWithView<', 'CompletedWithView<'),
  ],
] satisfies ReadonlyArray<readonly [string, string]>

describe('precise serialization boundaries through real oxlint', () => {
  it('accepts an exact named return regardless of producer name', () => {
    expect(diagnosticsFor('local', exactBoundary + parent)).toEqual([])
  })

  it('accepts a Composition built through a destructured Definition helper', () => {
    expect(
      diagnosticsFor(
        'extracted-composition',
        withExtractedCompositionFactory(exactBoundary) + parent,
      ),
    ).toEqual([])
  })

  it('accepts a Composition built through an inferred property alias', () => {
    const source = withExtractedCompositionFactory(exactBoundary).replace(
      'const { makeComposition: makeGraph } = Definition',
      'const makeGraph = Definition.makeComposition',
    )

    expect(diagnosticsFor('property-factory', source + parent)).toEqual([])
  })

  it.each([
    'const { makeComposition: makeGraph }: any = Definition',
    'const { makeComposition: makeGraph } = Definition as any',
    'const makeGraph: any = Definition.makeComposition',
    'const makeGraph = Definition.makeComposition as any',
    'const factory = Definition.makeComposition\nconst makeGraph: any = factory',
    'const factory = Definition.makeComposition\nconst makeGraph = factory as any',
  ])(
    'rejects a widened factory locally and through an import: %s',
    declaration => {
      const source = withExtractedCompositionFactory(exactBoundary).replace(
        'const { makeComposition: makeGraph } = Definition',
        declaration,
      )

      expect(diagnosticsFor('widened-factory', source + parent)).toHaveLength(1)

      writeFileSync(join(workDir, 'widened-factory-child.ts'), source)

      expect(
        diagnosticsFor(
          'imported-widened-factory',
          `import { Schema } from 'effect'\nimport { Child } from './widened-factory-child'\n${parent}`,
        ),
      ).toHaveLength(1)
    },
  )

  it('follows an extracted Composition factory through a completed Block import', () => {
    writeFileSync(
      join(workDir, 'extracted-composition-child.ts'),
      withExtractedCompositionFactory(exactBoundary),
    )

    expect(
      diagnosticsFor(
        'imported-extracted-composition',
        `import { Schema } from 'effect'\nimport { Child } from './extracted-composition-child'\n${parent}`,
      ),
    ).toEqual([])
  })

  it('follows renamed factory exports through the sibling Definition and a barrel', () => {
    writeFileSync(
      join(workDir, 'helper-definition.ts'),
      `import { Schema } from 'effect'
import { Block } from 'foldkit'
export const Model = Schema.Struct({ count: Schema.Number })
const Definition = Block.makeDefinition('Child', { Model, Message: Schema.Never })
export const { makeComposition: buildGraph } = Definition`,
    )
    writeFileSync(
      join(workDir, 'helper-barrel.ts'),
      "export { Model, buildGraph as createComposition } from './helper-definition'",
    )

    const source = exactBoundary
      .replace(
        'const Model = Schema.Struct({ count: Schema.Number })',
        "import { Model, createComposition as makeGraph } from './helper-barrel'",
      )
      .replace(
        "const Composition = Block.makeDefinition('Child', { Model, Message: Schema.Never }).makeComposition()",
        'const Composition = makeGraph()',
      )

    writeFileSync(join(workDir, 'split-composition-child.ts'), source)

    expect(diagnosticsFor('split-composition', source + parent)).toEqual([])
    expect(
      diagnosticsFor(
        'imported-split-composition',
        `import { Schema } from 'effect'\nimport { Child } from './split-composition-child'\n${parent}`,
      ),
    ).toEqual([])
  })

  it('accepts aliased Foldkit type imports', () => {
    const source = exactBoundary
      .replace(
        "import { Block } from 'foldkit'",
        "import { Block } from 'foldkit'\nimport type { AssemblyDraft as Draft, CompletedWithView as Completed } from 'foldkit/block'",
      )
      .replace('Block.AssemblyDraft<', 'Draft<')
      .replace('Block.CompletedWithView<', 'Completed<')
    expect(diagnosticsFor('aliased', source + parent)).toEqual([])
  })

  it('accepts the named view and OutMessage contract through a namespace import', () => {
    const source = exactBoundary
      .replace(
        "import { Block } from 'foldkit'",
        "import * as Block from 'foldkit/block'\nimport { defineMessageUnion } from 'foldkit/message'",
      )
      .replace(
        "const Composition = Block.makeDefinition('Child', { Model, Message: Schema.Never })",
        "const OutMessage = defineMessageUnion({ Submitted: {} })\nconst Composition = Block.makeDefinition('Child', { Model, Message: Schema.Never, OutMessage })",
      )
      .replace('CompletedWithView<', 'CompletedWithViewAndOutMessage<')
      .replace('FromAssemblyWithView<', 'FromAssemblyWithViewAndOutMessage<')
    expect(diagnosticsFor('with-out-message', source + parent)).toEqual([])
  })

  it('accepts explicit field mappings and a single return statement', () => {
    const source = exactBoundary
      .replace('const init =', 'const initModel =')
      .replace('readonly init: typeof init', 'readonly init: typeof initModel')
      .replace(
        '=>\n  Composition.prepareBlock({ init, update, view } satisfies Implementation)',
        '=> { return Composition.prepareBlock({ init: initModel, update, view } satisfies Implementation) }',
      )
    expect(diagnosticsFor('mapped-fields', source + parent)).toEqual([])
  })

  it('follows an exact boundary through a source import', () => {
    writeFileSync(join(workDir, 'exact-child.ts'), exactBoundary)
    expect(
      diagnosticsFor(
        'imported',
        `import { Schema } from 'effect'\nimport { Child } from './exact-child'\n${parent}`,
      ),
    ).toEqual([])
  })

  for (const [name, source] of rejectedBoundaries) {
    it(`rejects ${name}`, () => {
      expect(diagnosticsFor(name, source + parent)).toHaveLength(1)
    })

    it(`rejects ${name} with an extracted Composition factory`, () => {
      expect(
        diagnosticsFor(
          `extracted-${name}`,
          withExtractedCompositionFactory(source) + parent,
        ),
      ).toHaveLength(1)
    })
  }

  it('rejects a widened boundary through a source import', () => {
    writeFileSync(
      join(workDir, 'widened-child.ts'),
      exactBoundary.replace(
        'readonly init: typeof init',
        'readonly init: unknown',
      ),
    )
    expect(
      diagnosticsFor(
        'imported-widened',
        `import { Schema } from 'effect'\nimport { Child } from './widened-child'\n${parent}`,
      ),
    ).toHaveLength(1)
  })

  it('does not reuse top-level checked provenance for a shadowed local value', () => {
    expect(
      diagnosticsFor(
        'shadowed-child',
        exactBoundary +
          `
export const nested = () => {
  const build = (): any => Composition.prepareBlock({ init, update, view })
  const Child: Block.FromAssemblyWithView<typeof Model, typeof build> = Block.assemble(build)
  return Schema.Struct({ child: Child.Model })
}`,
      ),
    ).toHaveLength(1)
  })
})
