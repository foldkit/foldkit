import { Data } from 'effect'

import type { OutlineRect } from './types.js'

export type OutlineCommand = Data.TaggedEnum<{
  PushRects: { rects: ReadonlyArray<OutlineRect> }
  Scroll: { deltaX: number; deltaY: number }
  Resize: { width: number; height: number; dpr: number }
  Clear: {}
  SetVisible: { visible: boolean }
}>

export const OutlineCommand = Data.taggedEnum<OutlineCommand>()
