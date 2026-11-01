import { Option } from 'effect'

let openCallbackCount = 0
let frameTime = 0

/** Marks the current turn as an animation-frame callback for the frame at
 * `now`. Every callback in one frame receives the same `now`, so it
 * identifies the frame. Paired with {@link endAnimationFrameCallbackPhase},
 * which runs after the tick's Message has been processed. Nested callbacks
 * keep the phase open until each of them ends. */
export const beginAnimationFrameCallbackPhase = (now: number): void => {
  frameTime = now
  openCallbackCount += 1
}

/** Closes one {@link beginAnimationFrameCallbackPhase}. */
export const endAnimationFrameCallbackPhase = (): void => {
  if (openCallbackCount <= 0) {
    return
  }
  openCallbackCount -= 1
}

/** The frame whose animation-frame callbacks are still being processed. */
export const currentAnimationFrame = (): Option.Option<number> =>
  openCallbackCount > 0 ? Option.some(frameTime) : Option.none()
