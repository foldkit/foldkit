import { Array, pipe } from 'effect'
import { type HtmlBuilder } from 'foldkit/html'
import type * as MountDefinition from 'foldkit/mount'
import {
  Mount,
  click,
  expect,
  given,
  role,
  scene,
  text,
  within,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init } from './init'
import { Message } from './message'
import { type Model, SnippetSize } from './model'
import { MeasureSnippetHeight } from './mount'
import { update } from './update'
import { view } from './view'

const snippetId = 'counter-example'
const shortCode = 'const count = 0'
const longCode = pipe(
  Array.makeBy(16, index => `const value${index} = ${index}`),
  Array.join('\n'),
)

const testView =
  (rawCode: string) =>
  (
    model: Model,
    h: HtmlBuilder<
      Message,
      MountDefinition.RequirementsOf<typeof MeasureSnippetHeight>
    >,
  ) =>
    view(
      model,
      {
        id: snippetId,
        title: 'Counter state',
        content: h.pre([], [rawCode]),
        rawCode,
        copyAriaLabel: 'Copy counter state',
        renderCopyButton: () => h.empty,
      },
      h,
    )

const groupedView = (
  model: Model,
  h: HtmlBuilder<
    Message,
    MountDefinition.RequirementsOf<typeof MeasureSnippetHeight>
  >,
) => {
  return h.div(
    [],
    [
      view(
        model,
        {
          id: 'main-source',
          disclosureGroupId: 'example-source',
          title: 'Main source',
          content: h.pre([], [longCode]),
          rawCode: longCode,
          copyAriaLabel: 'Copy main source',
          renderCopyButton: () => h.empty,
        },
        h,
      ),
      view(
        model,
        {
          id: 'server-source',
          disclosureGroupId: 'example-source',
          title: 'Server source',
          content: h.pre([], [longCode]),
          rawCode: longCode,
          copyAriaLabel: 'Copy server source',
          renderCopyButton: () => h.empty,
        },
        h,
      ),
    ],
  )
}

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

  test('shares open state across snippets in one disclosure group', () => {
    scene(
      { update, view: groupedView },
      given(init().model),
      Mount.resolve(
        MeasureSnippetHeight({ snippetId: 'main-source' }),
        Message.CompletedMeasureSnippetHeight({
          snippetId: 'main-source',
          snippetSize: SnippetSize.Overflows(),
        }),
      ),
      Mount.resolve(
        MeasureSnippetHeight({ snippetId: 'server-source' }),
        Message.CompletedMeasureSnippetHeight({
          snippetId: 'server-source',
          snippetSize: SnippetSize.Overflows(),
        }),
      ),
      click(
        within(
          role('figure', { name: 'Main source' }),
          role('button', { name: 'Show code' }),
        ),
      ),
      expect(
        within(
          role('figure', { name: 'Server source' }),
          role('button', { name: 'Hide code' }),
        ),
      ).toExist(),
      click(
        within(
          role('figure', { name: 'Server source' }),
          role('button', { name: 'Hide code' }),
        ),
      ),
      expect(
        within(
          role('figure', { name: 'Main source' }),
          role('button', { name: 'Show code' }),
        ),
      ).toExist(),
    )
  })
})
