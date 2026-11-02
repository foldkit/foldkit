import { deliver, Block as makeBlockClass } from './block.js'
import { isBlockMessage } from './engine.js'

export type {
  AllOutMessageHandlers,
  BlockClass,
  BlockClassDeclaration,
  BlockMessage,
  ChildBlocksOf,
  Contract,
  Implementation,
  InitContext,
  InstanceMembers as Instance,
  MessageOf,
  ModelOf,
  OnEntry,
  OutMessageHandlers,
  OutMessageOf,
  Path,
  Result,
  Send,
  Subscription,
  UpdateRecord,
} from './block.js'
export type { MissingBlockLayer, Resolved } from './testing.js'
export { OnSlotTypeId } from './block.js'

/**
 * Declares a Block class. The class is the Block's contract: its Model,
 * Message, OutMessage, Command, and Mount lists. Implement it with `layer`,
 * create instances with `new` anywhere, and connect them by putting them in
 * a parent's Model.
 *
 * ```ts
 * export class Counter extends Block<Counter, { readonly max: number }>()('Counter', {
 *   Model: Schema.Struct({ count: Schema.Number, max: Schema.Number }),
 *   Message: defineMessageUnion({ ClickedIncrement: {} }),
 * }) {}
 *
 * export const CounterLive = Counter.toLayer(
 *   Effect.gen(function* () {
 *     return {
 *       init: ({ max }) => ({ count: 0, max }),
 *       update: {
 *         ClickedIncrement: model => ({
 *           model: { ...model, count: Math.min(model.count + 1, model.max) },
 *         }),
 *       },
 *       view: (model, h) =>
 *         h.button(
 *           [h.OnClick(Counter.Message.ClickedIncrement())],
 *           [`${model.count}`],
 *         ),
 *     }
 *   }),
 * )
 *
 * // in a parent's Model
 * left: new Counter('left', { max: 10 })
 * ```
 *
 * `Block.deliver` addresses a Message to an instance by its path for tests,
 * and `Block.isBlockMessage` recognizes such a Message.
 */
export const Block: typeof makeBlockClass &
  Readonly<{
    deliver: typeof deliver
    isBlockMessage: typeof isBlockMessage
  }> = Object.assign(makeBlockClass, {
  deliver,
  isBlockMessage,
})
