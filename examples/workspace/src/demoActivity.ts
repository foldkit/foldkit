import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { AppendActivity, AssignIssue } from './command'
import { makeStep } from './definition'
import { IssueDraft } from './domain'
import { maybeActiveIssueDetail } from './selection'

const ACTIVITY_EVENTS_PER_ASSIGNMENT = 3
const ACTIVITY_COMMENT_BODIES = [
  'I checked the latest changes. This is ready for another look.',
  'The next iteration is ready. Let me know what you think.',
  'Thanks for the update. I will pick this up next.',
]

export const simulateActivityStep = makeStep(model => {
  const maybeWorkspace = AsyncData.getData(model.workspaceAsyncData)

  if (Option.isNone(maybeWorkspace)) {
    return { model }
  }

  const { issues, members } = maybeWorkspace.value

  const memberRelatedIssues = Array.filter(
    issues,
    activityIssue =>
      Option.contains(activityIssue.maybeAssigneeId, model.activeMemberId) ||
      Array.some(
        activityIssue.comments,
        comment => comment.authorId === model.activeMemberId,
      ),
  )

  const activityIssueCandidates = Array.isReadonlyArrayNonEmpty(
    memberRelatedIssues,
  )
    ? memberRelatedIssues
    : issues

  const maybeActivityIssue = Option.orElse(
    Option.flatMap(maybeActiveIssueDetail(model), detail =>
      Array.findFirst(
        activityIssueCandidates,
        activityIssue => activityIssue.id === detail.issueId,
      ),
    ),
    () =>
      Array.get(
        activityIssueCandidates,
        model.activityTick % Math.max(1, activityIssueCandidates.length),
      ),
  )

  const maybeActivityActor = Array.findFirst(
    members,
    member => member.id !== model.activeMemberId,
  )

  if (Option.isNone(maybeActivityIssue) || Option.isNone(maybeActivityActor)) {
    return { model }
  }

  const activityIssue = maybeActivityIssue.value
  const actorId = maybeActivityActor.value.id
  const nextActivityTick = model.activityTick + 1

  const maybeIssueToAssign = Array.findFirst(
    issues,
    candidate =>
      !Option.contains(candidate.maybeAssigneeId, model.activeMemberId),
  )

  if (
    nextActivityTick % ACTIVITY_EVENTS_PER_ASSIGNMENT === 0 &&
    Option.isSome(maybeIssueToAssign)
  ) {
    const issueToAssign = maybeIssueToAssign.value

    return {
      model: modifyFields(model, { activityTick: () => nextActivityTick }),
      commands: [
        AssignIssue({
          issueId: issueToAssign.id,
          draft: IssueDraft.make({
            title: issueToAssign.title,
            description: issueToAssign.description,
            status: issueToAssign.status,
            priority: issueToAssign.priority,
            projectId: issueToAssign.projectId,
            maybeAssigneeId: Option.some(model.activeMemberId),
            labelIds: issueToAssign.labelIds,
          }),
          expectedVersion: issueToAssign.version,
          actorId,
        }),
      ],
    }
  }

  return {
    model: modifyFields(model, { activityTick: () => nextActivityTick }),
    commands: [
      AppendActivity({
        issueId: activityIssue.id,
        authorId: actorId,
        body: Array.getUnsafe(
          ACTIVITY_COMMENT_BODIES,
          model.activityTick % ACTIVITY_COMMENT_BODIES.length,
        ),
      }),
    ],
  }
})
