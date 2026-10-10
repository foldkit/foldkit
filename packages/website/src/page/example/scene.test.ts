import { inertHtml as ih } from 'foldkit/html'
import { given, scene, withViewInputs } from 'foldkit/scene'
import { describe, expect, test } from 'vitest'

import { type CodeBlock } from '../../component'
import { Message, init, update, view } from './exampleDetail'
import { type ExampleSources } from './sources'

const sources: ExampleSources = {
  files: [
    {
      path: 'src/main.ts',
      highlightedHtml: '<code>const count = 0</code>',
      rawCode: 'const count = 0',
    },
  ],
}

const { model } = update(
  init().model,
  Message.SucceededLoadExampleSources({ sources }),
)

const renderedSnippets = (
  slug: string,
): ReadonlyArray<{
  id: string
  disclosureGroupId: string | undefined
}> => {
  const snippets: Array<{ id: string; disclosureGroupId: string | undefined }> =
    []
  const renderSnippet: CodeBlock.RenderSnippet = config => {
    snippets.push({
      id: config.id,
      disclosureGroupId: config.disclosureGroupId,
    })
    return ih.empty
  }

  scene(
    {
      update,
      view: withViewInputs(view, {
        slug,
        isNarrowViewport: false,
        renderSnippet,
      })(),
    },
    given(model),
  )

  return snippets
}

describe('example detail', () => {
  test('source code uses separate file identities and one disclosure group', () => {
    expect(renderedSnippets('ssr')).toEqual([
      {
        id: 'example-ssr-source-src/main.ts',
        disclosureGroupId: 'example-ssr-source',
      },
    ])
  })
})
