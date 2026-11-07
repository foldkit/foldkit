import { Array, pipe } from 'effect'
import { Scene, Story } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { SnippetDisclosureBlock, layer } from './index'
import { Message } from './message'
import { type Model, SnippetSize } from './model'
import { MeasureSnippetHeight } from './mount'

const snippetDisclosureSubject = { block: SnippetDisclosureBlock, layer }

const snippetId = 'counter-example'
const shortCode = 'const count = 0'
const longCode = pipe(
  Array.makeBy(16, index => `const value${index} = ${index}`),
  Array.join('\n'),
)

const makeFixture = (
  block: Story.TestBlock<typeof snippetDisclosureSubject>,
) => {
  const init = block.init
  const update = block.update
  const view = block.view
  const groupedView = (
    model: Model,
    h: Parameters<Story.TestBlock<typeof snippetDisclosureSubject>['view']>[2],
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
  return { init, update, groupedView }
}

const snippetViewInputs = (rawCode: string) => ({
  id: snippetId,
  title: 'Counter state',
  content: ih.pre([], [rawCode]),
  rawCode,
  copyAriaLabel: 'Copy counter state',
  renderCopyButton: () => ih.empty,
})

describe('snippet disclosure', () => {
  it.effect('shows and hides the full code', () =>
    Scene.scene(
      {
        ...snippetDisclosureSubject,
        viewInputs: snippetViewInputs(longCode),
      },
      Scene.init(),
      Scene.Mount.resolve(
        MeasureSnippetHeight,
        Message.CompletedMeasureSnippetHeight({
          snippetId,
          snippetSize: SnippetSize.Overflows(),
        }),
      ),
      Scene.expect(Scene.role('figure', { name: 'Counter state' })).toExist(),
      Scene.expect(Scene.text('Counter state')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Show code' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Show code' })),
      Scene.expect(Scene.role('button', { name: 'Hide code' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Hide code' })),
      Scene.expect(Scene.role('button', { name: 'Show code' })).toExist(),
    ),
  )

  it.effect('does not offer to expand code that fits', () =>
    Scene.scene(
      {
        ...snippetDisclosureSubject,
        viewInputs: snippetViewInputs(shortCode),
      },
      Scene.init(),
      Scene.Mount.resolve(
        MeasureSnippetHeight,
        Message.CompletedMeasureSnippetHeight({
          snippetId,
          snippetSize: SnippetSize.Fits(),
        }),
      ),
      Scene.expect(Scene.role('button', { name: 'Show code' })).not.toExist(),
      Scene.expect(Scene.role('button', { name: 'Hide code' })).not.toExist(),
    ),
  )

  it.effect('shares open state across snippets in one disclosure group', () =>
    Story.withBlock(snippetDisclosureSubject, executable => {
      const { init, update, groupedView } = makeFixture(executable)

      Scene.scene(
        { update, view: groupedView },
        Scene.given(init().model),
        Scene.Mount.resolve(
          MeasureSnippetHeight({ snippetId: 'main-source' }),
          Message.CompletedMeasureSnippetHeight({
            snippetId: 'main-source',
            snippetSize: SnippetSize.Overflows(),
          }),
        ),
        Scene.Mount.resolve(
          MeasureSnippetHeight({ snippetId: 'server-source' }),
          Message.CompletedMeasureSnippetHeight({
            snippetId: 'server-source',
            snippetSize: SnippetSize.Overflows(),
          }),
        ),
        Scene.click(
          Scene.within(
            Scene.role('figure', { name: 'Main source' }),
            Scene.role('button', { name: 'Show code' }),
          ),
        ),
        Scene.expect(
          Scene.within(
            Scene.role('figure', { name: 'Server source' }),
            Scene.role('button', { name: 'Hide code' }),
          ),
        ).toExist(),
        Scene.click(
          Scene.within(
            Scene.role('figure', { name: 'Server source' }),
            Scene.role('button', { name: 'Hide code' }),
          ),
        ),
        Scene.expect(
          Scene.within(
            Scene.role('figure', { name: 'Main source' }),
            Scene.role('button', { name: 'Show code' }),
          ),
        ).toExist(),
      )
    }),
  )
})
