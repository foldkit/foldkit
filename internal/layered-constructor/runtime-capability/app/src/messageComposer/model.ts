import { Schema } from 'effect'

export const Model = Schema.Struct({ id: Schema.String, text: Schema.String })
export type Model = typeof Model.Type
