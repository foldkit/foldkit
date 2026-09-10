import { Schema } from 'effect'

export const Model = Schema.Record(Schema.String, Schema.Boolean)
export type Model = typeof Model.Type
