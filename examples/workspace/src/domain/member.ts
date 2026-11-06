import { Array, Schema } from 'effect'

export const Member = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  initials: Schema.String,
})
export type Member = typeof Member.Type

export const findById = (members: ReadonlyArray<Member>, memberId: string) =>
  Array.findFirst(members, member => member.id === memberId)
