import { Schema as S } from 'effect'

/** Schema for the transition animation state, tracking enter/leave phases for CSS transition coordination. */
export const TransitionState = S.Literal(
  'Idle',
  'EnterStart',
  'EnterAnimating',
  'LeaveStart',
  'LeaveAnimating',
)
export type TransitionState = typeof TransitionState.Type
