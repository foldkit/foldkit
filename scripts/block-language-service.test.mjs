import { Option } from 'effect'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { gzipSync } from 'node:zlib'

import {
  findWorkspaceTitleError,
  layerProfileSource,
  lspRequestArguments,
  readServerRssKiB,
  searchBindingHover,
  startServerMemorySampler,
  validateLayerProfileSourceHashes,
  validateResult,
  workspaceBindingCompletionTarget,
  workspaceBindingHover,
  workspaceBlockCompletionTarget,
} from '../packages/foldkit/scripts/profile-block-language-service.ts'
import { summarizeGoPprof } from '../packages/foldkit/scripts/summarize-go-pprof.ts'

const protobufVarint = value => {
  const bytes = []
  let remaining = BigInt(value)
  do {
    const next = Number(remaining & 0x7fn)
    remaining >>= 7n
    bytes.push(remaining === 0n ? next : next | 0x80)
  } while (remaining !== 0n)
  return Buffer.from(bytes)
}

const protobufVarintField = (number, value) =>
  Buffer.concat([protobufVarint(BigInt(number) << 3n), protobufVarint(value)])

const protobufBytesField = (number, value) =>
  Buffer.concat([
    protobufVarint((BigInt(number) << 3n) | 2n),
    protobufVarint(value.length),
    value,
  ])

const protobufMessage = fields => Buffer.concat(fields)

test('parameterless LSP requests omit params while preserving explicit null', () => {
  assert.deepEqual(lspRequestArguments('custom/stopCPUProfile', undefined), [
    'custom/stopCPUProfile',
  ])
  assert.deepEqual(lspRequestArguments('example/explicitNull', null), [
    'example/explicitNull',
    null,
  ])
})

test('workspace completion requires the public operation and Block authoring members', () => {
  const source = {
    uri: 'file:///workspace.ts',
    originalText: 'IssueDetailsBinding.embedView({})',
    text: 'IssueDetailsBinding.embedView({})',
    version: 1,
  }
  const target = workspaceBindingCompletionTarget(source)
  const result = {
    items: target.expectedLabels.map(label => ({ label })),
  }

  assert.equal(validateResult('workspace.bindingCompletion', target, result), 3)
  assert.throws(
    () =>
      validateResult('workspace.bindingCompletion', target, {
        items: [{ label: 'embedView' }, { label: 'init' }],
      }),
    /did not return the expected requestSave completions/,
  )

  const blockTarget = workspaceBlockCompletionTarget({
    ...source,
    originalText: 'ApplicationBlock.Message.ClickedLink',
    text: 'ApplicationBlock.Message.ClickedLink',
  })
  assert.throws(
    () => validateResult('workspace.blockCompletion', blockTarget, result),
    /did not return the expected Model, Message, makeComposition, makeLayer completions/,
  )
})

test('workspace title diagnostics require the assignment error at the exact property', () => {
  const prefix = 'const draft = { '
  const source = { text: `${prefix}title: () => value.length }\n` }
  const diagnostic = {
    code: 2322,
    message:
      "Type '() => number' is not assignable to type '(title: string) => string'.",
    range: {
      start: { line: 0, character: prefix.length },
      end: { line: 0, character: prefix.length + 'title'.length },
    },
  }

  assert.equal(
    Option.isSome(findWorkspaceTitleError(source, [diagnostic])),
    true,
  )
  assert.equal(Option.isNone(findWorkspaceTitleError(source, [])), true)
  assert.equal(
    Option.isNone(
      findWorkspaceTitleError(source, [{ ...diagnostic, code: 2304 }]),
    ),
    true,
  )
  assert.equal(
    Option.isNone(
      findWorkspaceTitleError(source, [
        {
          ...diagnostic,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 },
          },
        },
      ]),
    ),
    true,
  )
  assert.throws(
    () =>
      findWorkspaceTitleError({ text: source.text.repeat(2) }, [diagnostic]),
    /occurs more than once/,
  )
})

test('hover validation requires the current Binding type and rejects a wrong owner', () => {
  const target = {
    method: 'textDocument/hover',
    source: {
      uri: 'file:///workspace.ts',
      originalText: '',
      text: '',
      version: 1,
    },
    position: { line: 0, character: 0 },
    expectedBinding: {
      name: 'ChildBinding',
      owner: 'Child',
      typeNames: ['Block.DescriptorBinding'],
      requireSchemaHeader: true,
      schemaAlternatives: [['readonly value: String;']],
    },
  }
  const result = {
    contents:
      'ChildBinding: Block.DescriptorBinding<Owner<"Child">, Struct<{ readonly value: String; }>>',
  }

  assert.equal(validateResult('binding.hover', target, result), undefined)
  assert.throws(
    () =>
      validateResult('binding.hover', target, {
        contents: result.contents.replace('Owner<"Child">', 'Owner<"Other">'),
      }),
    /unexpected visible Binding shape/,
  )
  assert.throws(
    () =>
      validateResult('binding.hover', target, {
        contents: result.contents.replace(
          'readonly value: String;',
          'readonly value: Number;',
        ),
      }),
    /unexpected visible Binding shape/,
  )
})

test('Workspace hover validates the current issue identity and revision Schema', () => {
  const target = {
    method: 'textDocument/hover',
    source: {
      uri: 'file:///workspace.ts',
      originalText: '',
      text: '',
      version: 1,
    },
    position: { line: 0, character: 0 },
    expectedBinding: workspaceBindingHover,
  }
  const contents =
    'const IssueDetailsBinding: Block.DescriptorBindingMember<Block.BindingChildContract<Block.Owner<Block.NominalId<"IssueDetail", typeof IssueDetailKey>, true>, Struct<{ readonly issueId: String; readonly baselineRevision: Struct<{ readonly version: Number; readonly fields: Struct<{ readonly title: String; readonly status: Literals<readonly ["Backlog", "Done"]>; }>; }>; ... 6 more ...; }>>>'

  assert.equal(
    validateResult('workspace.hover', target, { contents }),
    undefined,
  )
  for (const invalid of [
    'const unrelated = "non-empty hover"',
    'const IssueDetailsBinding: any',
    'const IssueDetailsBinding: unknown',
    'const IssueDetailsBinding: never',
    'const IssueDetailsBinding: Block.DescriptorBindingMember<any>',
    'const IssueDetailsBinding: Block.DescriptorBindingMember<any> & Block.Owner<Block.NominalId<"IssueDetail", typeof IssueDetailKey>, true>',
    'const IssueDetailsBinding: Block.DescriptorBindingMember<unknown> & Block.Owner<Block.NominalId<"IssueDetail", typeof IssueDetailKey>, true>',
    'const IssueDetailsBinding: Block.DescriptorBindingMember<never> & Block.Owner<Block.NominalId<"IssueDetail", typeof IssueDetailKey>, true>',
    contents.replace('readonly issueId: String;', ''),
    contents.replace(
      'readonly baselineRevision: Struct<{',
      'readonly baselineRevision: any;',
    ),
    contents.replace('readonly fields: Struct<{', 'readonly fields: any;'),
    contents.replace('readonly title: String;', ''),
    contents.replace('readonly status: Literals<', 'readonly status: String;'),
    contents.replace('NominalId<"IssueDetail"', 'NominalId<"OtherChild"'),
  ]) {
    assert.throws(
      () => validateResult('workspace.hover', target, { contents: invalid }),
      /unexpected visible Binding shape/,
    )
  }
})

test('Website hover validates expanded and named current Schema displays', () => {
  const target = {
    method: 'textDocument/hover',
    source: {
      uri: 'file:///website.ts',
      originalText: '',
      text: '',
      version: 1,
    },
    position: { line: 0, character: 0 },
    expectedBinding: searchBindingHover,
  }
  const contentsFor = searchState =>
    `const SearchBinding: Block.ParentDescriptorBindingFields<Block.Owner<Block.NominalId<"Search", never>, true>, Struct<{ readonly dialog: DialogModel; readonly query: String; readonly searchState: ${searchState}; readonly activeResultIndex: Number; }>>`

  for (const searchState of [
    'TaggedUnion<...>',
    'TaggedUnion<{ readonly Idle: {}; readonly Loading: { results: $Array<Struct<{ readonly title: String; }>>; }; }>',
  ]) {
    assert.equal(
      validateResult('website.hover', target, {
        contents: contentsFor(searchState),
      }),
      undefined,
    )
  }

  assert.equal(
    validateResult('website.hover', target, {
      contents:
        'const SearchBinding: Block.DescriptorBinding<typeof SearchBlock, typeof Model> & Owner<"Search">',
    }),
    undefined,
  )

  for (const contents of [
    'const unrelated = "non-empty hover"',
    'const SearchBinding: any',
    'const SearchBinding: unknown',
    'const SearchBinding: never',
    contentsFor('any'),
    contentsFor('String'),
    contentsFor('TaggedUnion<...>').replace('readonly dialog:', 'dialog:'),
    contentsFor('TaggedUnion<...>').replace('readonly query: String;', ''),
    contentsFor('TaggedUnion<...>').replace(
      'NominalId<"Search"',
      'NominalId<"OtherChild"',
    ),
  ]) {
    assert.throws(
      () => validateResult('website.hover', target, { contents }),
      /unexpected visible Binding shape/,
    )
  }
})

test('Layer profile controls vary only the intended completion boundary', () => {
  const realSource = readFileSync(
    new URL('../packages/website/src/layer.ts', import.meta.url),
    'utf8',
  )
  const imports = layerProfileSource('imports', realSource)
  const rootInputs = layerProfileSource('root-inputs', realSource)
  const childLayers = layerProfileSource('child-layers', realSource)
  const unprovided = layerProfileSource('unprovided', realSource)
  const childNames = [
    'ApiReference',
    'BlockPage',
    'ComingFromReact',
    'ExampleDetail',
    'Home',
    'Playground',
    'Search',
    'SnippetCopy',
    'SnippetDisclosure',
    'Ui',
    'Dialog',
    'Menu',
  ]

  assert.doesNotMatch(imports, /\.makeLayer|\.pipe\(/)
  assert.match(rootInputs, /export const rootInputs = \{/)
  assert.doesNotMatch(
    rootInputs,
    /export const childLayers|\.makeLayer|\.pipe\(/,
  )
  assert.match(childLayers, /export const childLayers = \{/)
  assert.doesNotMatch(
    childLayers,
    /export const rootInputs|\.makeLayer|\.pipe\(/,
  )
  assert.match(unprovided, /ApplicationBlock\.makeLayer\(\{/)
  assert.doesNotMatch(unprovided, /\.pipe\(/)
  for (const name of childNames) {
    const member = `${name}: ${name}.layer`
    assert.equal(imports.includes(member), true)
    assert.equal(rootInputs.includes(member), false)
    assert.equal(childLayers.includes(member), true)
    assert.equal(unprovided.includes(member), true)
  }
  assert.equal(layerProfileSource('full', realSource), realSource)
  assert.equal(layerProfileSource('post-open', realSource), realSource)
  assert.match(
    layerProfileSource('minimal', realSource),
    /export const layer = ApplicationBlock/,
  )

  const hash = value => createHash('sha256').update(value).digest('hex')
  const kinds = [
    'minimal',
    'root-inputs',
    'child-layers',
    'imports',
    'unprovided',
    'full',
    'post-open',
  ]
  const measurements = kinds.map(kind => ({
    label: `layerProfile.${kind}.diagnostic`,
    sourceSha256: hash(layerProfileSource(kind, realSource)),
  }))

  assert.doesNotThrow(() =>
    validateLayerProfileSourceHashes(measurements, realSource),
  )
  assert.throws(
    () =>
      validateLayerProfileSourceHashes(
        measurements.map(measurement => ({
          ...measurement,
          sourceSha256: hash(realSource),
        })),
        realSource,
      ),
    /did not measure its generated control source/,
  )
})

test('pprof summary attributes flat and cumulative CPU samples', () => {
  const strings = [
    '',
    'samples',
    'count',
    'cpu',
    'nanoseconds',
    'github.com/microsoft/TypeScript/tsc/internal/checker.checkType',
    'tsc/internal/checker/checker.go',
    'github.com/microsoft/TypeScript/tsc/internal/project.loadProject',
    'tsc/internal/project/project.go',
    'runtime.gcDrain',
    'runtime/mgc.go',
  ]
  const valueType = (type, unit) =>
    protobufBytesField(
      1,
      protobufMessage([
        protobufVarintField(1, type),
        protobufVarintField(2, unit),
      ]),
    )
  const functionField = (id, name, filename) =>
    protobufBytesField(
      5,
      protobufMessage([
        protobufVarintField(1, id),
        protobufVarintField(2, name),
        protobufVarintField(4, filename),
      ]),
    )
  const locationField = (id, functionId) =>
    protobufBytesField(
      4,
      protobufMessage([
        protobufVarintField(1, id),
        protobufBytesField(
          4,
          protobufMessage([protobufVarintField(1, functionId)]),
        ),
      ]),
    )
  const sampleField = (locations, values) =>
    protobufBytesField(
      2,
      protobufMessage([
        protobufBytesField(1, Buffer.concat(locations.map(protobufVarint))),
        protobufBytesField(2, Buffer.concat(values.map(protobufVarint))),
      ]),
    )
  const profile = protobufMessage([
    valueType(1, 2),
    valueType(3, 4),
    sampleField([1, 2], [1, 100]),
    sampleField([3], [1, 50]),
    locationField(1, 1),
    locationField(2, 2),
    locationField(3, 3),
    functionField(1, 5, 6),
    functionField(2, 7, 8),
    functionField(3, 9, 10),
    ...strings.map(value => protobufBytesField(6, Buffer.from(value))),
    protobufVarintField(10, 200),
    protobufVarintField(12, 10),
  ])
  const summary = summarizeGoPprof(gzipSync(profile), 10)

  assert.equal(summary.total, 150)
  assert.deepEqual(summary.selectedSampleType, {
    type: 'cpu',
    unit: 'nanoseconds',
  })
  assert.equal(summary.topFlat[0]?.value, 100)
  assert.equal(summary.topFlat[0]?.name.includes('checker.checkType'), true)
  assert.equal(
    summary.topCumulative.some(
      row => row.name.includes('project.loadProject') && row.value === 100,
    ),
    true,
  )
  assert.deepEqual(
    summary.flatGroups.map(({ group, percentage }) => [group, percentage]),
    [
      ['checker', 66.67],
      ['runtime-gc', 33.33],
    ],
  )
})

test('server RSS measurements require a positive integer in KiB', () => {
  assert.equal(readServerRssKiB('  2048\n'), 2048)

  for (const invalid of ['', '0', '-1', 'NaN', '2 MiB', '1\n2']) {
    assert.throws(() => readServerRssKiB(invalid), /invalid RSS measurement/)
  }
})

test('short scenarios sample final server RSS once before repeated shutdown calls', async () => {
  let readCount = 0
  const sampler = await startServerMemorySampler(
    1767,
    'short-workspace',
    async processId => {
      assert.equal(processId, 1767)
      readCount += 1
      return readCount === 1 ? 1_024 : 131_072
    },
  )

  const firstStop = sampler.stop()
  const secondStop = sampler.stop()
  assert.equal(firstStop, secondStop)

  const memory = await firstStop
  assert.equal(readCount, 2)
  assert.deepEqual(
    memory.samples.map(({ phase }) => phase),
    ['Startup', 'Final'],
  )
  assert.equal(memory.peakRssKiB, 131_072)
  assert.equal(await sampler.stop(), memory)
  assert.equal(readCount, 2)
})
