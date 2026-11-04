import { Effect } from 'effect'
import { Block } from 'foldkit'
import { Child } from './child'
import { Message } from '../shared/message'
import { ParentBlock, makeStep } from '../shared/unified'

export const extracted = makeStep(model => ({ model, commands: [Receive({ message: Child.Message.ClickedUnifiedExtracted() })] }))
export const layer = ParentBlock.makeLayer(Effect.gen(function* () {
  const { makeCommandsStep } = ParentBlock
  const transition = makeCommandsStep(() => [Receive({ message: Child.Message.ClickedUnifiedLocal() })])

  return { init, update, transition }
}))
