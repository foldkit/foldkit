import { Array, Effect, Layer, Schema, pipe } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Mount, click, expect, role, scene, text, within } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { SnippetDisclosure, SnippetDisclosureLive } from './block'
import { Message } from './message'
import { SnippetSize } from './model'
import { MeasureSnippetHeight } from './mount'

const snippetId = 'counter-example'
const shortCode = 'const count = 0'
const longCode = pipe(
  Array.makeBy(16, index => `const value${index} = ${index}`),
  Array.join('\n'),
)

type HostModel = Readonly<{ snippetDisclosure: SnippetDisclosure }>

type HostView = (model: HostModel, h: HtmlBuilder<never>) => Html

class SnippetDisclosureHost extends Block<
  SnippetDisclosureHost,
  Readonly<{ hostView: HostView }>
>()('SnippetDisclosureHost', {
  Model: Schema.Struct({ snippetDisclosure: SnippetDisclosure }),
}) {}

const SnippetDisclosureHostLive = SnippetDisclosureHost.make(
  Effect.fn(function* (_id, { hostView }) {
    const snippetDisclosure = yield* new SnippetDisclosure('snippetDisclosure')

    return {
      model: { snippetDisclosure },
      view: hostView,
    }
  }),
).pipe(Layer.provide(SnippetDisclosureLive))

const singleView =
  (rawCode: string): HostView =>
  (model, h) =>
    model.snippetDisclosure.view({
      id: snippetId,
      title: 'Counter state',
      content: h.pre([], [rawCode]),
      rawCode,
      copyAriaLabel: 'Copy counter state',
      renderCopyButton: () => h.empty,
    })

const groupedView: HostView = (model, h) =>
  h.div(
    [],
    [
      model.snippetDisclosure.view({
        id: 'main-source',
        disclosureGroupId: 'example-source',
        title: 'Main source',
        content: h.pre([], [longCode]),
        rawCode: longCode,
        copyAriaLabel: 'Copy main source',
        renderCopyButton: () => h.empty,
      }),
      model.snippetDisclosure.view({
        id: 'server-source',
        disclosureGroupId: 'example-source',
        title: 'Server source',
        content: h.pre([], [longCode]),
        rawCode: longCode,
        copyAriaLabel: 'Copy server source',
        renderCopyButton: () => h.empty,
      }),
    ],
  )

describe('snippet disclosure', () => {
  it.effect('shows and hides the full code', () =>
    scene(
      SnippetDisclosureHostLive,
      { hostView: singleView(longCode) },
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
    ),
  )

  it.effect('does not offer to expand code that fits', () =>
    scene(
      SnippetDisclosureHostLive,
      { hostView: singleView(shortCode) },
      Mount.resolve(
        MeasureSnippetHeight,
        Message.CompletedMeasureSnippetHeight({
          snippetId,
          snippetSize: SnippetSize.Fits(),
        }),
      ),
      expect(role('button', { name: 'Show code' })).not.toExist(),
      expect(role('button', { name: 'Hide code' })).not.toExist(),
    ),
  )

  it.effect('shares open state across snippets in one disclosure group', () =>
    scene(
      SnippetDisclosureHostLive,
      { hostView: groupedView },
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
    ),
  )
})
