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

const renderedCopyButtonIds = (slug: string): ReadonlyArray<string> => {
  const ids: Array<string> = []
  const renderCopyButton: CodeBlock.RenderCopyButton = config => {
    ids.push(config.id)
    return ih.empty
  }

  scene(
    {
      update,
      view: withViewInputs(view, {
        slug,
        isNarrowViewport: false,
        isShowingChromeHint: false,
        renderCopyButton,
      })(),
    },
    given(model),
  )

  return ids
}

describe('example detail', () => {
  test('source copy controls include the example slug in their identity', () => {
    expect(renderedCopyButtonIds('ssr')).toEqual([
      'example-ssr-source-src/main.ts',
    ])
  })
})
