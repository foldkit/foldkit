import { Option, Schema as S } from 'effect'
import { to, when } from 'foldkit/experimental/machine'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'

const Idle = ts('Idle')
const Running = ts('Running')
const MachineState = S.Union([Idle, Running])
type MachineState = typeof MachineState.Type
type IdleState = typeof Idle.Type

const MachineMessage = defineMessageUnion({ Started: {} })
type MachineMessage = typeof MachineMessage.Type

export const startEdge = to<
  MachineState,
  MachineMessage,
  IdleState,
  MachineMessage,
  'Running'
>('Running', () => Running())

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
  () => Running(),
)
