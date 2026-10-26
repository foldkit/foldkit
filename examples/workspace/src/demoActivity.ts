import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { AppendActivity, AssignIssue } from './command'
import { makeStep } from './definition'
import { IssueDraft } from './domain'
import { maybeActiveIssueDetailInstance } from './model'

const ASSIGNMENT_ACTIVITY_INTERVAL = 3
const ACTIVITY_COMMENT_BODIES = [
  'I checked the latest changes. This is ready for another look.',
  'The next iteration is ready. Let me know what you think.',
  'Thanks for the update. I will pick this up next.',
]

export const simulateActivityStep = makeStep(model => {
  const maybeSnapshot = AsyncData.getData(model.workspaceAsyncData)

  if (Option.isNone(maybeSnapshot)) {
    return { model }
  }

  const { issues, members } = maybeSnapshot.value

  const relevantIssues = Array.filter(
    issues,
    issue =>
      Option.contains(issue.maybeAssigneeId, model.activeMemberId) ||
      Array.some(
        issue.comments,
        comment => comment.authorId === model.activeMemberId,
      ),
  )

  const candidates = Array.isReadonlyArrayNonEmpty(relevantIssues)
    ? relevantIssues
    : issues

  const maybeIssue = Option.orElse(
    Option.flatMap(maybeActiveIssueDetailInstance(model), instance =>
      Array.findFirst(candidates, issue => issue.id === instance.issueId),
    ),
    () =>
      Array.get(
        candidates,
        model.activityTick % Math.max(1, candidates.length),
      ),
  )

  const maybeActor = Array.findFirst(
    members,
    member => member.id !== model.activeMemberId,
  )

  if (Option.isNone(maybeIssue) || Option.isNone(maybeActor)) {
    return { model }
  }

  const issue = maybeIssue.value
  const actorId = maybeActor.value.id
  const nextActivityTick = model.activityTick + 1

  const maybeAssignment = Array.findFirst(
    issues,
    candidate =>
      !Option.contains(candidate.maybeAssigneeId, model.activeMemberId),
  )

  const isAssigning =
    nextActivityTick % ASSIGNMENT_ACTIVITY_INTERVAL === 0 &&
    Option.isSome(maybeAssignment)

  if (isAssigning && Option.isSome(maybeAssignment)) {
    const assignedIssue = maybeAssignment.value

    return {
      model: modifyFields(model, { activityTick: () => nextActivityTick }),
      commands: [
        AssignIssue({
          issueId: assignedIssue.id,
          draft: IssueDraft.make({
            title: assignedIssue.title,
            description: assignedIssue.description,
            status: assignedIssue.status,
            priority: assignedIssue.priority,
            projectId: assignedIssue.projectId,
            maybeAssigneeId: Option.some(model.activeMemberId),
            labelIds: assignedIssue.labelIds,
          }),
          expectedVersion: assignedIssue.version,
          actorId,
        }),
      ],
    }
  }

  return {
    model: modifyFields(model, { activityTick: () => nextActivityTick }),
    commands: [
      AppendActivity({
        issueId: issue.id,
        authorId: actorId,
        body: Array.getUnsafe(
          ACTIVITY_COMMENT_BODIES,
          model.activityTick % ACTIVITY_COMMENT_BODIES.length,
        ),
      }),
    ],
  }
})
