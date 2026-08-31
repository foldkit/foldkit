import { isOutlineRecordingEnabled } from '../outline/public.js'

export { isOutlineRecordingEnabled }

const stack: Array<boolean> = []

export const beginDirty = (): void => {
  if (!isOutlineRecordingEnabled()) {
    return
  }
  stack.push(false)
}

export const markDirty = (): void => {
  if (!isOutlineRecordingEnabled()) {
    return
  }
  if (stack.length > 0) {
    stack[stack.length - 1] = true
  } else {
    stack.push(true)
  }
}

export const consumeDirty = (): boolean => {
  if (!isOutlineRecordingEnabled()) {
    return false
  }
  if (stack.length === 0) {
    return false
  }
  const next = stack.pop()!
  return next
}
