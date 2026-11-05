import { Context, Effect, Schema } from 'effect'
import { expect, test } from 'vitest'

import { CurrentInstance } from '../block/instanceContext.js'
import { type Html, type HtmlBuilder } from '../html/public.js'
import {
  requireMountDispatchResolver,
  requireRuntimeContext,
} from '../html/runtimeSingleton.js'
import { defineMessageUnion } from '../message/public.js'
import * as Mount from '../mount/public.js'
import * as Scene from '../scene/public.js'
import * as Surface from './apps/retainedMountDelivery/surface.js'

const Model = Schema.Struct({ width: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  CompletedMeasure: { width: Schema.Number },
})
type Message = typeof Message.Type
const Measure = Mount.define('Measure', {
  messages: [Message.CompletedMeasure],
  handler: function* () {
    return () => Effect.die(new Error('Mount handler must not execute'))
  },
})
const update = (_model: Model, message: Message) => ({
  model: Model.make({ width: message.width }),
})
const makeConstant = (): Html => {
  let build = (): Html => {
    throw new Error('Missing builder')
  }
  Scene.scene(
    {
      update,
      view: (_model, h) => {
        build = () => h.div([h.OnMount(Measure())])
        return h.div([])
      },
    },
    Scene.given(Model.make({ width: 0 })),
  )
  return build()
}
const constant = makeConstant()

test('resolves a constant OnMount VNode created without a render frame', () => {
  Scene.scene(
    {
      update,
      view: (model, h) =>
        h.section([], [constant, h.span([], [String(model.width)])]),
    },
    Scene.given(Model.make({ width: 0 })),
    Scene.Mount.resolve(Measure, Message.CompletedMeasure({ width: 400 })),
    Scene.expect(Scene.selector('span')).toHaveText('400'),
  )
})

test('ordinary Scene stays Replay and delivers root Mounts without CurrentInstance', () => {
  const view = (
    model: Model,
    h: HtmlBuilder<Message, Mount.RequirementsOf<typeof Measure>>,
  ) => {
    expect(requireMountDispatchResolver().owner).toBe('Replay')
    expect(
      Context.get(requireRuntimeContext(), CurrentInstance),
    ).toBeUndefined()
    return h.div([h.OnMount(Measure())], [String(model.width)])
  }
  Scene.scene(
    { update, view },
    Scene.given(Model.make({ width: 0 })),
    Scene.Mount.resolve(Measure, Message.CompletedMeasure({ width: 300 })),
    Scene.expect(Scene.selector('div')).toHaveText('300'),
  )
})

test('a Block root Mount uses the same initial and later delivery path', async () => {
  await Effect.runPromise(
    Scene.scene(
      {
        block: Surface.SurfaceBlock,
        layer: Surface.layer,
        viewInputs: { form: 'nested', toView: () => constant },
      },
      Scene.init(),
      Scene.Mount.resolve(
        Surface.ObserveSurface,
        Surface.Message.MeasuredSurface({ width: 100 }),
      ),
      Scene.Mount.emit(
        Surface.ObserveSurface,
        Surface.Message.MeasuredSurface({ width: 700 }),
      ),
      Scene.expect(Scene.selector('#surface')).toHaveText('700'),
    ),
  )
})

test('Scene does not invoke VNode insertion or destruction hooks', () => {
  const hooks: Array<string> = []
  Scene.scene(
    {
      update,
      view: (model, h) => {
        const node =
          model.width === 0 ? h.div([h.OnMount(Measure())]) : h.span([])
        if (node === null) throw new Error('Expected an element')
        return {
          ...node,
          data: {
            ...node.data,
            hook: {
              insert: () => {
                hooks.push('insert')
              },
              destroy: () => {
                hooks.push('destroy')
              },
            },
          },
        }
      },
    },
    Scene.given(Model.make({ width: 0 })),
    Scene.Mount.resolve(Measure, Message.CompletedMeasure({ width: 100 })),
    Scene.Mount.expectEnded(Measure),
  )
  expect(hooks).toEqual([])
})
