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
const workDir = mkdtempSync(join(tmpdir(), 'foldkit-contract-authoring-lint-'))
const bundlePath = join(workDir, 'plugin.mjs')

beforeAll(async () => {
  await buildPlugin(bundlePath)
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const diagnosticsFor = (name: string, rule: string, source: string) => {
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
  return runOxlint({ oxlintBin, cwd: workDir, configPath, target: sourcePath })
}

const contract = `
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
const key = Symbol('Child')
const Model = Schema.Struct({ timestamp: Schema.Number })
const ChildDefinition = Block.makeDefinition('Child', {
  key, Model, Message: Schema.Never, InitArgs: Schema.Tuple([]),
})
export const ChildBlock = ChildDefinition.contract
`

describe('independent Block authoring through real oxlint', () => {
  it('accepts static contracts and constructor-owned implementations in parent Schemas', () => {
    const source =
      contract +
      `
export const ChildImplementation = ChildDefinition.makeBlock(Effect.gen(function* () {
  return { init: ChildDefinition.makeInit(() => ({ model: Model.make({ timestamp: 0 }) })),
    update: ChildDefinition.makeUpdate({}) }
}))
export const layer = ChildImplementation.layer
export const PublicParent = Schema.Struct({ child: ChildBlock.Model })
export const ImplementedParent = Schema.Struct({ child: ChildImplementation.Model })
`
    expect(
      diagnosticsFor(
        'contract-model',
        'no-completed-block-model-in-schema',
        source,
      ),
    ).toEqual([])
    expect(
      diagnosticsFor('contract-names', 'block-name-matches-variable', source),
    ).toEqual([])
    writeFileSync(join(workDir, 'child.ts'), source)
    expect(
      diagnosticsFor(
        'imported-contract',
        'no-completed-block-model-in-schema',
        `
import { Schema } from 'effect'
import { ChildBlock, ChildImplementation } from './child'
export const Parent = Schema.Struct({ child: ChildBlock.Model, implemented: ChildImplementation.Model })
`,
      ),
    ).toEqual([])
  })

  it('retains diagnostics for inferred native completed Blocks beside static contracts', () => {
    const source =
      contract +
      `
const NativeComposition = Block.makeDefinition('Native', { Model, Message: Schema.Never }).makeComposition()
const NativeBlock = Block.assemble(() => NativeComposition.prepareBlock({ init, update }))
export const Parent = Schema.Struct({ safe: ChildBlock.Model, native: NativeBlock.Model })
`
    const diagnostics = diagnosticsFor(
      'native-and-contract',
      'no-completed-block-model-in-schema',
      source,
    )
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.message).toContain('Definition.contract')
  })

  it('permits effectful constructor code, attached handlers, and deferred invocation work', () => {
    const source =
      contract +
      `
export const ChildImplementation = ChildDefinition.makeBlock(Effect.gen(function* () {
  const constructionTime = Date.now()
  const ReadClock = ChildDefinition.makeCommand('ReadClock', {
    messages: [],
    handler: function* () {
      const startedAt = Date.now()
      return () => Effect.sync(() => Date.now() - startedAt)
    },
  })
  const init = ChildDefinition.makeInit(() => ({ model: Model.make({ timestamp: constructionTime }) }))
  return { init, update: ChildDefinition.makeUpdate({}) }
}))
`
    expect(
      diagnosticsFor(
        'effect-constructor',
        'no-impure-call-at-decision-time',
        source,
      ),
    ).toEqual([])
  })

  it.each([
    'ChildDefinition.makeInit(() => ({ model: Model.make({ timestamp: Date.now() }) }))',
    'ChildDefinition.makeUpdate({ ClickedRefresh: model => ({ model, commands: [ReadClock(Date.now())] }) })',
    'ChildDefinition.makeStep(model => ({ model: { ...model, timestamp: Date.now() } }))',
    'ChildDefinition.makeFieldsStep(() => ({ timestamp: () => Date.now() }))',
    'ChildDefinition.makeCommandsStep(() => [ReadClock(Date.now())])',
    'ChildDefinition.makeOutMessageStep(() => InformedTime({ timestamp: Date.now() }))',
    'ChildDefinition.makeView((model, h) => h.div([], [String(Date.now())]))',
    'makeInit(() => ({ model: Model.make({ timestamp: Date.now() }) }))',
    'makeStep.fromMessage(({ value }) => ({ model: Model.make({ timestamp: value + Date.now() }) }))',
  ])(
    'rejects a pure producer nested in an effectful constructor: %s',
    expression => {
      const source =
        contract +
        `
const { makeInit, makeStep } = ChildDefinition
export const ChildImplementation = ChildDefinition.makeBlock(Effect.gen(function* () {
  const producer = ${expression}
  return { producer }
}))
`
      expect(
        diagnosticsFor(
          'pure-constructor-callback',
          'no-impure-call-at-decision-time',
          source,
        ),
      ).toHaveLength(1)
    },
  )

  it('still permits an explicitly deferred Effect inside a pure producer', () => {
    const source =
      contract +
      `
export const ChildImplementation = ChildDefinition.makeBlock(Effect.gen(function* () {
  const update = ChildDefinition.makeUpdate({
    ClickedRefresh: model => ({ model, commands: [ReadClock(Effect.sync(() => Date.now()))] }),
  })
  return { update }
}))
`
    expect(
      diagnosticsFor(
        'nested-deferred-effect',
        'no-impure-call-at-decision-time',
        source,
      ),
    ).toEqual([])
  })

  it('checks named pure producers authored inside a constructor', () => {
    const source =
      contract +
      `
export const ChildImplementation = ChildDefinition.makeBlock(Effect.gen(function* () {
  const init = () => ({ model: Model.make({ timestamp: Date.now() }) })
  const update = model => ({ model: { ...model, timestamp: Math.random() } })
  const initialize = init
  return { init: ChildDefinition.makeInit(initialize), update: ChildDefinition.makeUpdate({ ClickedRefresh: update }) }
}))
`
    expect(
      diagnosticsFor(
        'named-pure-producers',
        'no-impure-call-at-decision-time',
        source,
      ),
    ).toHaveLength(2)
  })

  it('does not mistake a shadowed ordinary callback API for a Definition', () => {
    const source =
      contract +
      `
export const ChildImplementation = ChildDefinition.makeBlock(Effect.gen(function* () {
  const ChildDefinition = { makeInit: callback => callback() }
  const timestamp = ChildDefinition.makeInit(() => Date.now())
  return { timestamp }
}))
`
    expect(
      diagnosticsFor(
        'shadowed-authoring',
        'no-impure-call-at-decision-time',
        source,
      ),
    ).toEqual([])
  })
})
