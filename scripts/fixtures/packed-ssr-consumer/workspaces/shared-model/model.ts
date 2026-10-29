import { Schema } from 'effect'

export const Model = Schema.Struct({ title: Schema.String })
export type Model = typeof Model.Type
