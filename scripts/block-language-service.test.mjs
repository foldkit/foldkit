import { Option } from 'effect'
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findWorkspaceTitleError,
  readServerRssKiB,
  searchBindingHover,
  startServerMemorySampler,
  validateResult,
  workspaceBindingCompletionTarget,
  workspaceBindingHover,
  workspaceBlockCompletionTarget,
} from '../packages/foldkit/scripts/profile-block-language-service.ts'

test('workspace completion requires the public operation and completed Block members', () => {
  const source = {
    uri: 'file:///workspace.ts',
    originalText: '\nIssueDetailBinding.init\n',
    text: '\nIssueDetailBinding.init\n',
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
    /did not return the expected Model, Message, makeView, replaceEffectsLayer completions/,
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

test('keyed hover validation preserves the Website initialized Binding requirement', () => {
  const target = {
    method: 'textDocument/hover',
    source: {
      uri: 'file:///workspace.ts',
      originalText: '',
      text: '',
      version: 1,
    },
    position: { line: 0, character: 0 },
    expectedBinding: { name: 'ChildBinding', owner: 'Child' },
  }
  const result = {
    contents: 'ChildBinding: Block.KeyedBinding<Owner<"Child">>',
  }

  assert.equal(
    validateResult(
      'workspace.hover',
      {
        ...target,
        expectedBinding: workspaceBindingHover,
      },
      {
        contents:
          'const IssueDetailBinding: Block.BindingWithoutOutMessagePolicy<Block.AssemblyWithViewAndOutMessage<Struct<{ readonly issueId: String; readonly baseline: Struct<{ readonly version: Number; }>; readonly draft: Struct<{ readonly title: String; }>; }>, ...>>',
      },
    ),
    undefined,
  )

  assert.throws(
    () => validateResult('website.hover', target, result),
    /unexpected visible Binding shape/,
  )
  assert.equal(
    validateResult(
      'workspace.hover',
      {
        ...target,
        expectedBinding: {
          ...target.expectedBinding,
          typeNames: ['Block.KeyedBinding'],
        },
      },
      result,
    ),
    undefined,
  )
  assert.throws(
    () =>
      validateResult(
        'workspace.hover',
        {
          ...target,
          expectedBinding: {
            ...target.expectedBinding,
            typeNames: ['Block.KeyedBinding'],
          },
        },
        { contents: 'ChildBinding: Block.KeyedBinding<Owner<"OtherChild">>' },
      ),
    /unexpected visible Binding shape/,
  )
  assert.throws(
    () =>
      validateResult(
        'workspace.hover',
        {
          ...target,
          expectedBinding: {
            ...target.expectedBinding,
            typeNames: ['Block.KeyedBinding'],
          },
        },
        { contents: 'ChildBinding: BlockXKeyedBinding<Owner<"Child">>' },
      ),
    /unexpected visible Binding shape/,
  )
})

test('Workspace hover validates the current issue identity and draft Schema', () => {
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
    'const IssueDetailBinding: Block.BindingWithoutOutMessagePolicy<Block.AssemblyWithViewAndOutMessage<Struct<{ readonly issueId: String; readonly baseline: Struct<{ readonly version: Number; }>; readonly draft: Struct<{ readonly title: String; }>; }>, ...>>'

  assert.equal(
    validateResult('workspace.hover', target, { contents }),
    undefined,
  )
  for (const invalid of [
    'const IssueDetailBinding: any',
    'const IssueDetailBinding: unknown',
    'const IssueDetailBinding: never',
    'const IssueDetailBinding: Block.BindingWithoutOutMessagePolicy<any>',
    'const IssueDetailBinding: Block.BindingWithoutOutMessagePolicy<any> & Owner<"IssueDetail">',
    'const IssueDetailBinding: Block.BindingWithoutOutMessagePolicy<any> IssueDetailBlock readonly route: RouteUnion<{',
    'const IssueDetailBinding: Block.BindingWithoutOutMessagePolicy<unknown> & Owner<"IssueDetail">',
    'const IssueDetailBinding: Block.BindingWithoutOutMessagePolicy<never> & Owner<"IssueDetail">',
    contents.replace('readonly issueId: String;', ''),
    contents.replace('readonly baseline: Struct<{', 'readonly baseline: any;'),
    contents.replace('readonly draft: Struct<{', 'readonly draft: any;'),
    `${contents} & Owner<"OtherChild">`,
  ]) {
    assert.throws(
      () => validateResult('workspace.hover', target, { contents: invalid }),
      /unexpected visible Binding shape/,
    )
  }
})

test('Website hover validates expanded and abbreviated Schema displays', () => {
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
    `const SearchBinding: InitializedBinding<GeneratedDirectBindingReturn<AssemblyWithView<Struct<{ readonly query: String; readonly searchState: ${searchState}; readonly activeResultIndex: Number; }>, ...>>>`

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

  for (const contents of [
    'const SearchBinding: any',
    'const SearchBinding: unknown',
    'const SearchBinding: never',
    contentsFor('any'),
    contentsFor('String'),
    contentsFor('TaggedUnion<...>').replace('readonly query: String;', ''),
    `${contentsFor('TaggedUnion<...>')} & Owner<"OtherChild">`,
  ]) {
    assert.throws(
      () => validateResult('website.hover', target, { contents }),
      /unexpected visible Binding shape/,
    )
  }
})

test('Website hover validates the storage-evidence display without accepting erased Schemas', () => {
  const target = {
    method: 'textDocument/hover',
    expectedBinding: searchBindingHover,
  }
  const contentsFor = searchState =>
    `const SearchBinding: BindingEvidence<AssemblyWithView<Struct<{ readonly query: String; readonly searchState: ${searchState}; readonly activeResultIndex: Number; }>, ...>, never, Readonly<...>, false> & ...`

  assert.equal(
    validateResult('website.hover', target, {
      contents: contentsFor('TaggedUnion<...>'),
    }),
    undefined,
  )

  for (const contents of [
    'const SearchBinding: BindingEvidence<any, never, Readonly<...>, false>',
    'const SearchBinding: BindingEvidence<unknown, never, Readonly<...>, false>',
    contentsFor('any'),
    contentsFor('String'),
    contentsFor('TaggedUnion<...>').replace('readonly query: String;', ''),
    contentsFor('TaggedUnion<...>').replace(', false>', ', true>'),
    'const SearchBinding: BindingEvidence<Opaque, never, Readonly<...>, false> & Owner<"Search">',
    `${contentsFor('TaggedUnion<...>').replace('readonly query: String;', '')} & Owner<"Search">`,
    `${contentsFor('TaggedUnion<...>')} & Owner<"OtherChild">`,
  ]) {
    assert.throws(
      () => validateResult('website.hover', target, { contents }),
      /unexpected visible Binding shape/,
    )
  }
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
