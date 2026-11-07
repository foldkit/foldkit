import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { Message, ParentBlock, makeStep } from '../shared/unified'

export const extracted = makeStep(model => ({ model, commands: [Receive({ message: Message.ClickedSave() })] }))
const LocalKey = Symbol('Local')
const LocalBlock = Block.make('Local', { key: LocalKey, Model, Message, InitArgs: Schema.Tuple([]) })
const { makeCommandsStep } = LocalBlock
export const transition = makeCommandsStep(() => [Receive({ message: Message.ClickedSave() })])
