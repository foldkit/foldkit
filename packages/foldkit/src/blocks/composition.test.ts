import { Effect, Fiber, Layer, Schema } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import type { ChildAttribute } from '../html/childAttribute.js'
import { childAttributes } from '../html/index.js'
import type { Html } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { click, deliver, role, expect as sceneExpect } from '../test/scene.js'
import type { Url } from '../url/index.js'
import { Block, deliver as deliverTo } from './block.js'
import { make } from './program.js'
import { scene } from './testing.js'

// VIEW INPUT

type ToggleViewInput = Readonly<{
  toView: (
    attributes: Readonly<{ button: ReadonlyArray<ChildAttribute> }>,
    isOn: boolean,
  ) => Html
}>

class Toggle extends Block<Toggle, void, ToggleViewInput>()('Toggle', {
  Model: Schema.Struct({ isOn: Schema.Boolean }),
  Message: defineMessageUnion({ ClickedToggle: {} }),
}) {}

const ToggleLive = Toggle.make(
  Effect.fn(function* () {
    return {
      model: { isOn: false },
      update: {
        ClickedToggle: model => ({ model: { isOn: !model.isOn } }),
      },
      view: (model, h, { toView }) =>
        toView(
          {
            button: childAttributes([
              h.OnClick(Toggle.Message.ClickedToggle()),
            ]),
          },
          model.isOn,
        ),
    }
  }),
)

class Settings extends Block<Settings>()('Settings', {
  Model: Schema.Struct({ toggle: Toggle, resetCount: Schema.Number }),
  Message: defineMessageUnion({ ClickedReset: {} }),
}) {}

const SettingsLive = Settings.make(
  Effect.fn(function* () {
    const toggle = yield* new Toggle('toggle')

    return {
      model: { toggle, resetCount: 0 },
      update: {
        ClickedReset: model => ({
          model: { ...model, resetCount: model.resetCount + 1 },
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            model.toggle.view({
              toView: (attributes, isOn) =>
                h.div(
                  [],
                  [
                    h.button([...attributes.button], [isOn ? 'On' : 'Off']),
                    h.button(
                      [h.OnClick(Settings.Message.ClickedReset())],
                      [`Reset ${model.resetCount}`],
                    ),
                  ],
                ),
            }),
          ],
        ),
    }
  }),
)

// MOUNT, EXPOSE, ROUTING

const MeasureMessage = defineMessageUnion({
  MeasuredWidth: { tag: Schema.String },
})

const Measure = Mount.define('Measure', {
  messages: [MeasureMessage.MeasuredWidth],
})

class Panel extends Block<Panel, void, void, Readonly<{ label: string }>>()(
  'Panel',
  {
    Model: Schema.Struct({ maybeTag: Schema.String }),
    Message: MeasureMessage,
    Mount: [Measure],
  },
) {}

const PanelLive = Panel.make(
  Effect.fn(function* () {
    return {
      model: { maybeTag: '' },
      update: {
        MeasuredWidth: (model, { tag }) => ({
          model: { ...model, maybeTag: tag },
        }),
      },
      mounts: {
        Measure: ({ element }) =>
          Effect.succeed(Panel.Message.MeasuredWidth({ tag: element.tagName })),
      },
      expose: { label: 'panel' },
      view: (model, h) =>
        h.section([h.Id('panel'), h.OnMount(Measure())], [model.maybeTag]),
    }
  }),
)

const ShellMessage = defineMessageUnion({
  ClickedLink: { request: Schema.Unknown },
  ChangedUrl: { url: Schema.Unknown },
  ClickedRead: {},
  CompletedRead: { label: Schema.String },
})

const ReadLabel = Command.define('ReadLabel', {
  messages: [ShellMessage.CompletedRead],
})

class Shell extends Block<Shell, Readonly<{ url: Url }>>()('Shell', {
  Model: Schema.Struct({
    path: Schema.String,
    panel: Panel,
    label: Schema.String,
  }),
  Message: ShellMessage,
  Command: [ReadLabel],
}) {}

const ShellLive = Shell.make(
  Effect.fn(function* (_id, { url }) {
    const panel = yield* new Panel('panel')

    return {
      model: { path: url.pathname, panel, label: '' },
      update: {
        ClickedLink: model => ({ model }),
        ChangedUrl: model => ({ model }),
        ClickedRead: model => ({ model, commands: [ReadLabel()] }),
        CompletedRead: (model, { label }) => ({ model: { ...model, label } }),
      },
      commands: {
        ReadLabel: () =>
          panel.use.pipe(
            Effect.map(({ label }) => Shell.Message.CompletedRead({ label })),
            Effect.catchTag('NotConnected', () =>
              Effect.succeed(Shell.Message.CompletedRead({ label: 'none' })),
            ),
          ),
      },
      view: (model, h) => ({
        title: model.path,
        body: h.div(
          [],
          [
            h.span([h.Id('path')], [model.path]),
            h.span([h.Id('label')], [model.label]),
            h.button(
              [h.Id('read'), h.OnClick(Shell.Message.ClickedRead())],
              ['Read'],
            ),
            model.panel.view(),
          ],
        ),
      }),
    }
  }),
)

const waitFor = (predicate: () => boolean) =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (predicate()) {
        return
      }
      yield* Effect.sleep('5 millis')
    }
    throw new Error('Timed out waiting for condition')
  })

describe('Block composition', () => {
  it.effect('renders parent callbacks inside a child as the parent', () =>
    scene(
      SettingsLive.pipe(Layer.provide(ToggleLive)),
      click(role('button', { name: 'Off' })),
      sceneExpect(role('button', { name: 'On' })).toExist(),
      click(role('button', { name: 'Reset 0' })),
      sceneExpect(role('button', { name: 'Reset 1' })).toExist(),
      sceneExpect(role('button', { name: 'On' })).toExist(),
    ),
  )

  it.effect('delivers a child Message in a Scene', () =>
    scene(
      SettingsLive.pipe(Layer.provide(ToggleLive)),
      deliver(deliverTo(Toggle, 'toggle', Toggle.Message.ClickedToggle())),
      sceneExpect(role('button', { name: 'On' })).toExist(),
    ),
  )

  it.live(
    'runs child Mounts, gives the root its URL, and exposes values to Commands',
    () =>
      Effect.gen(function* () {
        const container = document.createElement('div')
        container.id = 'shell'
        document.body.append(container)

        const program = make(Shell, {
          layer: ShellLive.pipe(Layer.provide(PanelLive)),
          container,
          routing: {
            onUrlRequest: (request: unknown) =>
              Shell.Message.ClickedLink({ request }),
            onUrlChange: (url: unknown) => Shell.Message.ChangedUrl({ url }),
          },
        })

        const fiber = yield* Effect.forkChild(program.start())
        const text = (id: string) => document.getElementById(id)?.textContent

        yield* waitFor(() => text('panel') === 'SECTION')
        expect(text('path')).toBe(window.location.pathname)

        document.getElementById('read')?.click()
        yield* waitFor(() => text('label') === 'panel')

        yield* Fiber.interrupt(fiber)
        container.remove()
      }),
  )
})
