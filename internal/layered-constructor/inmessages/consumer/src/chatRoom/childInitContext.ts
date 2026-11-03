import { Schema } from 'effect'

export const ChildInitContext = Schema.Struct({ inputId: Schema.String })
export type ChildInitContext = typeof ChildInitContext.Type
