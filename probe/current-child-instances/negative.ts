import { Array, Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { CounterBlock, Message } from './counter.js'
import { ApplicationDefinition } from './definition.js'
import { CountersBinding } from './composition.js'

const ForeignParentKey = Symbol('ForeignUnifiedParent')
const ForeignParent = Block.make('ForeignUnifiedParent', {
  key: ForeignParentKey,
  Model: ApplicationDefinition.Model,
  Message: ApplicationDefinition.Message,
  Init: Schema.Tuple([]),
})
const CounterComposition = CounterBlock.makeComposition()
if (false) {
  // @ts-expect-error The unified public value has no contract projection.
  void CounterBlock.contract
  // @ts-expect-error The preferred completion is the direct ordinary Layer.
  void CounterBlock.makeBlock
  // @ts-expect-error The old input builder is not part of the current API.
  CounterComposition.makeReceive({})
  // @ts-expect-error Created Instances retain the child's declared startup tuple.
  CountersBinding.create({ key: 'bad', args: ['wrong'] })
  // @ts-expect-error A ready Instance always contains its child's Model.
  CounterBlock.Instance.make({ key: 'bad', args: [1] })
  // @ts-expect-error Occurrence requests cannot be inserted into another owner's fields Step.
  ForeignParent.makeFieldsStep(() => ({ counters: Array.append(CountersBinding.create({ key: 'bad', args: [1] })) }))
  // @ts-expect-error Local update still exhaustively handles the owning ordinary Messages.
  CounterComposition.makeUpdate({ CompletedReadCount: (model: typeof CounterBlock.Model.Type) => ({ model }) })
  // @ts-expect-error Current InMessage update is a checked plan, not a plain callback.
  CounterBlock.makeLayer(Effect.succeed({
    children: [],
    init: CounterComposition.makeInit((count: number) => ({ model: { count } })),
    update: CounterComposition.makeUpdate({
      CompletedReadCount: model => ({ model }),
      ReceivedCount: model => ({ model }),
    }),
    inMessageUpdate: (model: typeof CounterBlock.Model.Type) => ({ model }),
  }))
  void ApplicationDefinition
  void Message
}
