import { deliver, Block as makeBlockClass } from './block.js'
import { NotConnected, isBlockMessage } from './engine.js'

export type {
  BlockClass,
  BlockMessage,
  Contract,
  Factory,
  Implementation,
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
export type { Resolved } from './testing.js'
export type { BlockParent } from './engine.js'
export { OnSlotTypeId } from './block.js'
export { NotConnected } from './engine.js'

/**
 * Declares a Block class. The class is the Block's contract: its Model,
 * Message, OutMessage, Command, and Mount lists. Implement it with `make`,
 * create instances with `new` inside a parent constructor, and connect them by
 * putting them in the parent's Model.
 *
 * ```ts
 * export class Counter extends Block<Counter, { readonly max: number }>()('Counter', {
 *   Model: Schema.Struct({ count: Schema.Number }),
 *   Message: defineMessageUnion({ ClickedIncrement: {} }),
 * }) {}
 *
 * export const CounterLive = Counter.make(
 *   Effect.fn(function* (id, { max }) {
 *     return {
 *       model: { count: 0 },
 *       update: { ClickedIncrement: model => ({ model: { count: model.count + 1 } }) },
 *       view: (model, h) => h.button([h.OnClick(Counter.Message.ClickedIncrement())], [`${model.count}`]),
 *     }
 *   }),
 * )
 * ```
 *
 * `Block.deliver` addresses a Message to an instance by its path for tests,
 * `Block.isBlockMessage` recognizes such a Message, and `Block.NotConnected`
 * is the error `instance.use` fails with.
 */
export const Block: typeof makeBlockClass &
  Readonly<{
    deliver: typeof deliver
    isBlockMessage: typeof isBlockMessage
    NotConnected: typeof NotConnected
  }> = Object.assign(makeBlockClass, {
  deliver,
  isBlockMessage,
  NotConnected,
})
