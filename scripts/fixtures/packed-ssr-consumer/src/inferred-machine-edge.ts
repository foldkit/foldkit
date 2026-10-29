import { Option, Schema } from 'effect'
import { makeDefinition } from 'foldkit/experimental/machine'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

const MachineState = defineTaggedUnion({
  Idle: {},
  Running: { label: Schema.String },
})
type MachineState = typeof MachineState.Type
const MachineMessage = defineMessageUnion({ Started: {} })
type MachineMessage = typeof MachineMessage.Type
const MachineContext = Schema.Struct({
  canStart: Schema.Boolean,
  label: Schema.String,
})
type MachineContext = typeof MachineContext.Type

const RunDefinition = makeDefinition({
  State: MachineState,
  Message: MachineMessage,
  Context: MachineContext,
})
const { makeGuard, makeHandler, makeTransitions, to, when, ignore } =
  RunDefinition

const maybeLabel = makeGuard({ from: 'Idle', on: 'Started' }, ({ context }) =>
  context.canStart ? Option.some(context.label) : Option.none(),
)
const start = makeHandler(maybeLabel, ({ guardValue: label }) => ({
  model: MachineState.Running({ label }),
}))
const idleTransitions = makeTransitions('Idle', {
  on: {
    Started: [when(maybeLabel, 'Running', start), ignore()],
  },
})
const directTransitions = makeTransitions('Idle', {
  on: {
    Started: to('Running', ({ context }) => ({
      model: MachineState.Running({ label: context.label }),
    })),
  },
})

export const startEdge = directTransitions.on.Started
export const guardedStartEdges = idleTransitions.on.Started
export const contextualMachine = RunDefinition.makeMachine({
  initial: MachineState.Idle(),
  states: { Idle: idleTransitions },
})

export const rejectedInputs = () => {
  // @ts-expect-error Packed declarations keep the selected source state precise.
  makeTransitions('Running', { on: idleTransitions.on })
  // @ts-expect-error A declared Context is required after package installation.
  contextualMachine.transition(MachineState.Idle(), MachineMessage.Started())
}
