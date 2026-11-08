import { Number, Schema, Stream } from 'effect'
import { Block, Dom, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ tickCount: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ TickedFrame: {} })
type Message = typeof Message.Type

const FrameProbeKey = Symbol('FrameProbe')
const FrameProbeBlock = Block.make('FrameProbe', {
  key: FrameProbeKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const { makeComposition, makeFieldsStep, makeSubscriptions } = FrameProbeBlock
const FrameProbeComposition = makeComposition()
const init = FrameProbeComposition.makeInit(() => ({ model: { tickCount: 0 } }))
const update = FrameProbeComposition.makeUpdate({
  TickedFrame: makeFieldsStep(() => ({ tickCount: Number.increment })),
})
const view = FrameProbeComposition.makeView((model, h) =>
  h.div([h.Id('tick-count')], [String(model.tickCount)]),
)
const subscriptions = makeSubscriptions(entry => ({
  frames: entry(
    'FrameTicks',
    {},
    {
      messages: [Message.TickedFrame],
      modelToDependencies: () => ({}),
      handler: function* () {
        return () =>
          Dom.animationFrameTicks.pipe(Stream.map(() => Message.TickedFrame()))
      },
    },
  ),
}))
const layer = FrameProbeBlock.makeLayer({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer: subscriptions.layer,
})
const program = Program.makeElement({
  block: FrameProbeBlock,
  layer,
  container: document.getElementById('root'),
})
const handle = Runtime.embed(program)
Object.defineProperty(window, 'stopFrameProbe', {
  value: () => handle.dispose(),
})
