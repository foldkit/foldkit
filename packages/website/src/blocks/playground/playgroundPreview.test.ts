import { Scene } from 'foldkit'
import { type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { describe, expect as expectValue, test } from 'vitest'

import * as PlaygroundPreview from './playgroundPreview'

const PREVIEW_URL = 'https://preview.example.test'
const STALE_PREVIEW_URL = 'https://stale.example.test'
const preview = Scene.selector('iframe')
const Message = defineMessageUnion({ LoadedPreview: {} })
type Message = typeof Message.Type

const previewApp = {
  update: (state: PlaygroundPreview.State, _message: Message) => ({
    model: state,
  }),
  view: (state: PlaygroundPreview.State, h: HtmlBuilder<Message>) =>
    PlaygroundPreview.view(
      state,
      Message.LoadedPreview(),
      ih.div([], ['Preparing preview…']),
      h,
    ),
}

const expectPreviewKey =
  (expectedKey: string) =>
  (simulation: Scene.SceneSimulation<PlaygroundPreview.State, Message>) => {
    const frame = simulation.html.children?.find(
      child => typeof child !== 'string' && child.sel === 'iframe',
    )
    if (frame === undefined || typeof frame === 'string') {
      throw new Error('The preview iframe was not rendered')
    } else {
      expectValue(frame.key).toBe(expectedKey)
      return simulation
    }
  }

describe('playground preview', () => {
  test('loads only the current preview', () => {
    const loading = PlaygroundPreview.start(PREVIEW_URL)
    const loaded = PlaygroundPreview.load(loading, PREVIEW_URL)
    expectValue(PlaygroundPreview.load(loading, STALE_PREVIEW_URL)).toBe(
      loading,
    )
    expectValue(loaded).toEqual(
      PlaygroundPreview.State.Loaded({ previewUrl: PREVIEW_URL }),
    )
    expectValue(PlaygroundPreview.load(loaded, PREVIEW_URL)).toBe(loaded)
  })

  test('keeps a loading frame out of reach', () => {
    Scene.scene(
      previewApp,
      Scene.given(PlaygroundPreview.start(PREVIEW_URL)),
      Scene.expect(preview).toHaveHandler('load'),
      Scene.expect(preview).toHaveAttr('inert', 'true'),
      Scene.expect(preview).toHaveAttr('aria-hidden', 'true'),
      Scene.expect(preview).toHaveAttr('tabIndex', '-1'),
      Scene.expect(preview).toHaveClass('invisible'),
      Scene.expect(preview).toHaveClass('pointer-events-none'),
      Scene.expect(Scene.text('Preparing preview…')).toExist(),
      expectPreviewKey(PREVIEW_URL),
    )
  })

  test('reveals a loaded frame', () => {
    Scene.scene(
      previewApp,
      Scene.given(PlaygroundPreview.State.Loaded({ previewUrl: PREVIEW_URL })),
      Scene.expect(preview).toHaveAttr('inert', 'false'),
      Scene.expect(preview).toHaveAttr('aria-hidden', 'false'),
      Scene.expect(preview).toHaveAttr('tabIndex', '0'),
      Scene.expect(preview).toHaveClass('opacity-100'),
      Scene.expect(Scene.selector('.hidden')).toContainText(
        'Preparing preview…',
      ),
      expectPreviewKey(PREVIEW_URL),
    )
  })

  test('keys a different preview URL as a different frame', () => {
    Scene.scene(
      previewApp,
      Scene.given(PlaygroundPreview.start(STALE_PREVIEW_URL)),
      expectPreviewKey(STALE_PREVIEW_URL),
    )
  })
})
