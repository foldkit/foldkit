import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/scene-tests-run-from-root.ts'

const testFile = '/repo/apps/ui/test/main.scene.test.ts'
const sourceFile = '/repo/apps/ui/src/page/chat/view.ts'

const parent = (child: object, value: object) => {
  Object.defineProperty(child, 'parent', { value })
}

const namespaceImport = (local: string, source: string) =>
  Testing.importDeclWithSpecifiers(source, [
    Testing.importNamespaceSpecifier(local),
  ])

const namedImport = (imported: string, local: string, source: string) =>
  Testing.importDeclWithSpecifiers(source, [
    Testing.importSpecifier(imported, local),
  ])

const config = (update: unknown, view: unknown) =>
  Testing.objectExpr([
    { key: 'update', value: update },
    { key: 'view', value: view },
  ])

const scene = (sceneConfig: unknown) =>
  Testing.callOfMember('Scene', 'scene', [sceneConfig])

const constConfig = (name: string, value: unknown) => {
  const declarator = Testing.varDeclarator(name, value)
  parent(declarator, {
    type: 'VariableDeclaration',
    kind: 'const',
    declarations: [declarator],
  })
  return declarator
}

const viewFunctionCalling = (namespace: string) =>
  Testing.arrowFn(
    Testing.callOfMember(namespace, 'view', [Testing.id('model')]),
    [Testing.id('model')],
  )

const stubUpdate = Testing.arrowFn(Testing.id('model'), [
  Testing.id('model'),
  Testing.id('_message'),
])

const run = (
  events: ReadonlyArray<readonly [visitor: string, node: unknown]>,
  filename = testFile,
) =>
  Testing.runRuleMulti(rule, [...events, ['Program:exit', Testing.program()]], {
    filename,
  })

describe('scene-tests-run-from-root', () => {
  it('flags literal Scene configs using page namespace update/view', () => {
    const result = run([
      [
        'ImportDeclaration',
        namespaceImport('Chat', '../../src/page/chat/index.ts'),
      ],
      [
        'CallExpression',
        scene(
          config(
            Testing.memberExpr('Chat', 'update'),
            Testing.memberExpr('Chat', 'view'),
          ),
        ),
      ],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('page module')
  })

  it('flags same-file const Scene configs whose view function references a page import', () => {
    const sceneConfig = config(
      Testing.id('update'),
      viewFunctionCalling('Chat'),
    )
    const result = run([
      [
        'ImportDeclaration',
        namespaceImport('Chat', '../../src/page/chat/index.ts'),
      ],
      [
        'ImportDeclaration',
        namedImport('update', 'update', '../src/update/index.ts'),
      ],
      ['VariableDeclarator', constConfig('config', sceneConfig)],
      ['CallExpression', scene(Testing.id('config'))],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '../../src/page/chat/index.ts',
    )
  })

  it('flags page named imports used directly as update/view', () => {
    const result = run([
      [
        'ImportDeclaration',
        namedImport('update', 'chatUpdate', '../../src/page/chat/index.ts'),
      ],
      [
        'ImportDeclaration',
        namedImport('view', 'chatView', '../../src/page/chat/index.ts'),
      ],
      [
        'CallExpression',
        scene(config(Testing.id('chatUpdate'), Testing.id('chatView'))),
      ],
    ])
    expect(result).toHaveLength(1)
  })

  it('flags widget-isolated configs only when update and view trace to the same widget', () => {
    const result = run([
      [
        'ImportDeclaration',
        namespaceImport('PromptPane', '../../src/widget/prompt-pane/index.ts'),
      ],
      [
        'CallExpression',
        scene(
          config(
            Testing.memberExpr('PromptPane', 'update'),
            Testing.memberExpr('PromptPane', 'view'),
          ),
        ),
      ],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('widget `prompt-pane`')
  })

  it('allows root update/view Scene configs', () => {
    const result = run([
      [
        'ImportDeclaration',
        namedImport('update', 'update', '../src/update/index.ts'),
      ],
      [
        'ImportDeclaration',
        namedImport('view', 'view', '../src/view/index.ts'),
      ],
      [
        'CallExpression',
        scene(config(Testing.id('update'), Testing.id('view'))),
      ],
    ])
    expect(result).toHaveLength(0)
  })

  it('allows pure render-helper configs with a stub update and widget view', () => {
    const result = run([
      [
        'ImportDeclaration',
        namedImport('markdown', 'markdown', '../../src/widget/markdown.ts'),
      ],
      [
        'CallExpression',
        scene(
          config(
            stubUpdate,
            Testing.arrowFn(
              Testing.callExpr('markdown', [Testing.id('model')]),
              [Testing.id('model')],
            ),
          ),
        ),
      ],
    ])
    expect(result).toHaveLength(0)
  })

  it('allows widget provenance when update and view are different widgets', () => {
    const result = run([
      [
        'ImportDeclaration',
        namespaceImport('PromptPane', '../../src/widget/prompt-pane/index.ts'),
      ],
      [
        'ImportDeclaration',
        namespaceImport(
          'CommandPalette',
          '../../src/widget/command-palette/index.ts',
        ),
      ],
      [
        'CallExpression',
        scene(
          config(
            Testing.memberExpr('PromptPane', 'update'),
            Testing.memberExpr('CommandPalette', 'view'),
          ),
        ),
      ],
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag unused page fixture imports when Scene uses root update/view', () => {
    const result = run([
      [
        'ImportDeclaration',
        namespaceImport('CiPrompts', '../src/page/ci-prompts/index.ts'),
      ],
      [
        'ImportDeclaration',
        namedImport('update', 'update', '../src/update/index.ts'),
      ],
      [
        'ImportDeclaration',
        namedImport('view', 'view', '../src/view/index.ts'),
      ],
      [
        'CallExpression',
        scene(config(Testing.id('update'), Testing.id('view'))),
      ],
    ])
    expect(result).toHaveLength(0)
  })

  it('ignores non-object first args and missing same-file const configs', () => {
    const result = run([
      ['CallExpression', scene(Testing.callExpr('makeSceneConfig'))],
      ['CallExpression', scene(Testing.id('externalConfig'))],
    ])
    expect(result).toHaveLength(0)
  })

  it('does not run outside apps/ui/test files', () => {
    const result = run(
      [
        [
          'ImportDeclaration',
          namespaceImport('Chat', '../../src/page/chat/index.ts'),
        ],
        [
          'CallExpression',
          scene(
            config(
              Testing.memberExpr('Chat', 'update'),
              Testing.memberExpr('Chat', 'view'),
            ),
          ),
        ],
      ],
      sourceFile,
    )
    expect(result).toHaveLength(0)
  })
})
