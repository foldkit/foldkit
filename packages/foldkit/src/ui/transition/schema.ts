import { Schema as S } from 'effect'

import { m } from '../../message/index.js'

// TRANSITION STATE

/** Schema for the transition animation state, tracking enter/leave phases for CSS transition coordination. */
export const TransitionState = S.Literal(
  'Idle',
  'EnterStart',
  'EnterAnimating',
  'LeaveStart',
  'LeaveAnimating',
)
export type TransitionState = typeof TransitionState.Type

// MODEL

/** Schema for the transition component's state, tracking its unique ID, visibility intent, and animation phase. */
export const Model = S.Struct({
  id: S.String,
  isShowing: S.Boolean,
  transitionState: TransitionState,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the transition should enter (become visible). Starts the enter animation sequence. */
export const Showed = m('Showed')
/** Sent when the transition should leave (become hidden). Starts the leave animation sequence. */
export const Hid = m('Hid')
/** Sent internally when a double-rAF completes, advancing the transition to its animating phase. */
export const AdvancedTransitionFrame = m('AdvancedTransitionFrame')
/** Sent internally when all CSS transitions on the transition element have completed. */
export const EndedTransition = m('EndedTransition')

/** Union of all messages the transition component can produce. */
export const Message: S.Union<
  [
    typeof Showed,
    typeof Hid,
    typeof AdvancedTransitionFrame,
    typeof EndedTransition,
  ]
> = S.Union(Showed, Hid, AdvancedTransitionFrame, EndedTransition)
export type Message = typeof Message.Type

export type Showed = typeof Showed.Type
export type Hid = typeof Hid.Type

// OUT MESSAGE

/** Sent to the parent when the leave transition advances to LeaveAnimating. The parent is responsible for providing the command that detects when the leave animation completes (e.g. WaitForTransitions or a racing command). Use `defaultLeaveCommand` for the standard behavior. */
export const StartedLeaveAnimating = m('StartedLeaveAnimating')
/** Sent to the parent when the leave animation completes. The parent can use this to unmount content or update its own state. */
export const TransitionedOut = m('TransitionedOut')

export const OutMessage = S.Union(StartedLeaveAnimating, TransitionedOut)
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a transition model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isShowing?: boolean
}>

/** Creates an initial transition model from a config. Defaults to hidden. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isShowing: config.isShowing ?? false,
  transitionState: 'Idle',
})
