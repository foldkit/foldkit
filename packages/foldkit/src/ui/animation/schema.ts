import { Schema as S } from 'effect'

import { m } from '../../message/index.js'

// TRANSITION STATE

/** Schema for the animation lifecycle state, tracking enter/leave phases. */
export const TransitionState = S.Literal(
  'Idle',
  'EnterStart',
  'EnterAnimating',
  'LeaveStart',
  'LeaveAnimating',
)
export type TransitionState = typeof TransitionState.Type

// MODEL

/** Schema for the animation component's state, tracking its unique ID, visibility intent, and lifecycle phase. */
export const Model = S.Struct({
  id: S.String,
  isShowing: S.Boolean,
  transitionState: TransitionState,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the animation should enter (become visible). Starts the enter sequence. */
export const Showed = m('Showed')
/** Sent when the animation should leave (become hidden). Starts the leave sequence. */
export const Hid = m('Hid')
/** Sent internally when a double-rAF completes, advancing the lifecycle to its animating phase. */
export const AdvancedAnimationFrame = m('AdvancedAnimationFrame')
/** Sent internally when all CSS animations on the element have settled. Covers both CSS transitions and CSS keyframe animations. */
export const EndedAnimation = m('EndedAnimation')

/** Union of all messages the animation component can produce. */
export const Message: S.Union<
  [
    typeof Showed,
    typeof Hid,
    typeof AdvancedAnimationFrame,
    typeof EndedAnimation,
  ]
> = S.Union(Showed, Hid, AdvancedAnimationFrame, EndedAnimation)
export type Message = typeof Message.Type

export type Showed = typeof Showed.Type
export type Hid = typeof Hid.Type

// OUT MESSAGE

/** Sent to the parent when the leave sequence advances to LeaveAnimating. The parent is responsible for providing the command that detects when the leave animation completes (e.g. WaitForAnimationSettled or a racing command). Use `defaultLeaveCommand` for the standard behavior. */
export const StartedLeaveAnimating = m('StartedLeaveAnimating')
/** Sent to the parent when the leave animation completes. The parent can use this to unmount content or update its own state. */
export const TransitionedOut = m('TransitionedOut')

export const OutMessage = S.Union(StartedLeaveAnimating, TransitionedOut)
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
})
