import { type HtmlBuilder } from 'foldkit/html'
import { Mount, click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init } from './init'
import { Message } from './message'
import { type Model, SnippetSize } from './model'
import { MeasureSnippetHeight } from './mount'
import { renderer } from './renderer'
import { update } from './update'

const snippetId = 'counter-example'
const shortCode = 'const count = 0'
const longCode = globalThis.Array.from(
  { length: 16 },
  (_, index) => `const value${index} = ${index}`,
).join('\n')

const testView = (rawCode: string) => (model: Model, h: HtmlBuilder<Message>) =>
  renderer(
    model,
    message => message,
    () => h.empty,
    h,
  )({
    id: snippetId,
    title: 'Counter state',
    content: h.pre([], [rawCode]),
    rawCode,
    copyAriaLabel: 'Copy counter state',
  })

describe('snippet disclosure', () => {
  test('shows and hides the full code', () => {
    scene(
      {
        update,
        view: testView(longCode),
      },
      given(init().model),
      Mount.resolve(
        MeasureSnippetHeight,
        Message.CompletedMeasureSnippetHeight({
          snippetId,
          snippetSize: SnippetSize.Overflows(),
        }),
      ),
      expect(role('figure', { name: 'Counter state' })).toExist(),
      expect(text('Counter state')).toExist(),
      expect(role('button', { name: 'Show code' })).toExist(),
      click(role('button', { name: 'Show code' })),
      expect(role('button', { name: 'Hide code' })).toExist(),
      click(role('button', { name: 'Hide code' })),
      expect(role('button', { name: 'Show code' })).toExist(),
    )
  })

  test('does not offer to expand code that fits', () => {
    scene(
      { update, view: testView(shortCode) },
      given(init().model),
      Mount.resolve(
        MeasureSnippetHeight,
        Message.CompletedMeasureSnippetHeight({
          snippetId,
          snippetSize: SnippetSize.Fits(),
        }),
      ),
      expect(role('button', { name: 'Show code' })).not.toExist(),
      expect(role('button', { name: 'Hide code' })).not.toExist(),
    )
  })
})
