export type { OutlineRect } from './types.js'
export {
  setOutlineRecordingEnabled,
  shouldRecordOutline as isOutlineRecordingEnabled,
} from '../html/boundary.js'

export const OUTLINE_CUSTOM_EVENT = 'foldkit:outline'
