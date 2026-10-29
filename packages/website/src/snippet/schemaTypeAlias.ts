import { Schema } from 'effect'

export const Person = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
})
export type Person = typeof Person.Type

export const displayName = (person: Person): string => person.name
