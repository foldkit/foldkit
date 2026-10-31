import { Schema } from 'effect'

export const Tool = Schema.Literals(['Brush', 'Fill', 'Eraser'])
export type Tool = typeof Tool.Type
