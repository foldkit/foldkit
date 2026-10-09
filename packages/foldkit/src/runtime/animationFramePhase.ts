let animationFrameCallbackDepth = 0

/** Marks the current turn as an animation-frame callback. Paired with
 * {@link endAnimationFrameCallbackPhase}, which runs after the tick's
 * Message has been processed. Nested callbacks keep the phase open until
 * each of them ends. */
export const beginAnimationFrameCallbackPhase = (): void => {
  animationFrameCallbackDepth += 1
}

/** Closes one {@link beginAnimationFrameCallbackPhase}. */
export const endAnimationFrameCallbackPhase = (): void => {
  if (animationFrameCallbackDepth <= 0) {
    return
  }
  animationFrameCallbackDepth -= 1
}

/** Whether a Message is being processed from an animation-frame callback
 * that has not rendered yet. */
export const isInAnimationFrameCallbackPhase = (): boolean =>
  animationFrameCallbackDepth > 0
