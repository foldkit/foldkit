import { Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

const AssigneeChoice = defineTaggedUnion({
  Unassigned: {},
  Assigned: { memberId: Schema.String },
})
const AssigneeChoiceJson = Schema.fromJsonString(AssigneeChoice)

export const assigneeValue = (maybeMemberId: Option.Option<string>) =>
  Schema.encodeSync(AssigneeChoiceJson)(
    Option.match(maybeMemberId, {
      onNone: AssigneeChoice.Unassigned,
      onSome: memberId => AssigneeChoice.Assigned({ memberId }),
    }),
  )

export const decodeAssigneeSelection = (value: string) =>
  Option.map(
    Schema.decodeOption(AssigneeChoiceJson)(value),
    AssigneeChoice.match({
      Unassigned: Option.none,
      Assigned: ({ memberId }) => Option.some(memberId),
    }),
  )
