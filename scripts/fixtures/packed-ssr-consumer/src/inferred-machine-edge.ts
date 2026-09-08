import { Option, Schema } from 'effect'
import { define, to, when } from 'foldkit/experimental/machine'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

const MachineState = defineTaggedUnion({
  Idle: {},
  Running: { label: Schema.String },
})
type MachineState = typeof MachineState.Type
type IdleState = typeof MachineState.Idle.Type

const MachineMessage = defineMessageUnion({ Started: {} })
type MachineMessage = typeof MachineMessage.Type

export const startEdge = to<
  MachineState,
  MachineMessage,
  IdleState,
  MachineMessage,
  'Running'
>('Running', () => ({ model: MachineState.Running({ label: 'direct' }) }))

export const guardedStartEdge = when<
  MachineState,
  MachineMessage,
  IdleState,
  MachineMessage,
  Option.Option<number>,
  'Running'
>(
  state => Option.some(state._tag.length),
  'Running',
  () => ({ model: MachineState.Running({ label: 'guarded' }) }),
)

const MachineContext = Schema.Struct({
  canStart: Schema.Boolean,
  label: Schema.String,
})

export const contextualMachine = define({
  state: MachineState,
  message: MachineMessage,
  context: MachineContext,
})({
  initial: MachineState.Idle(),
  states: {
    Idle: {
      on: {
        Started: [
          when(
            (_state, _message, context) => context.canStart,
            'Running',
            ({ context }) => ({
              model: MachineState.Running({ label: context.label }),
            }),
          ),
        ],
      },
    },
  },
})
