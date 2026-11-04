import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

const ChildBlock = Block.make('Child', { key: ChildKey, Model, Message, Init })
export const ParentModel = Schema.Struct({ child: ChildBlock.Model })
export const layer = ChildBlock.makeLayer(Effect.gen(function* () {
  return { init, update }
}))
