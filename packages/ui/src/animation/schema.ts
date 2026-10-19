import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// TRANSITION STATE

/** Schema for the animation lifecycle state, tracking enter/leave phases. */
export const TransitionState = Schema.Literals([
  'Idle',
  'EnterStart',
  'EnterAnimating',
  'LeaveStart',
  'LeaveAnimating',
])
export type TransitionState = typeof TransitionState.Type

// MODEL

/** Schema for Animation state, including the transition generation used to reject
 *  stale Command results. */
export const Model = Schema.Struct({
  id: Schema.String,
  isShowing: Schema.Boolean,
  transitionState: TransitionState,
  transitionGeneration: Schema.Number,
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the animation component can produce. */
export const Message = defineMessageUnion({
  Showed: {},
  Hid: {},
  CompletedWaitForPaint: { generation: Schema.Number },
  EndedAnimation: { generation: Schema.Number },
})
export type Message = typeof Message.Type

export type Showed = typeof Message.Showed.Type
export type Hid = typeof Message.Hid.Type

// OUT MESSAGE

/** Union of the facts Animation reports to its parent. */
export const OutMessage = defineMessageUnion({
  StartedLeaveAnimating: { generation: Schema.Number },
  TransitionedOut: {},
})
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating an animation model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isShowing?: boolean
}>

/** Creates an initial animation model from a config. Defaults to hidden. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isShowing: config.isShowing ?? false,
  transitionState: 'Idle',
  transitionGeneration: 0,
})
