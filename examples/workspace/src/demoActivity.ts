import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeStep } from './block'
import { AddIssueComment, AssignIssue } from './command'
import { Issue } from './domain'
import { maybeIssueId } from './route'

const ACTIVITY_REQUESTS_PER_ASSIGNMENT = 3
const ACTIVITY_COMMENT_BODIES = [
  'I checked the latest changes. This is ready for another look.',
  'The next iteration is ready. Let me know what you think.',
  'Thanks for the update. I will pick this up next.',
]

export const simulateTeammateActivity = makeStep(model => {
  const maybeWorkspace = AsyncData.getData(model.workspaceAsyncData)

  if (Option.isNone(maybeWorkspace)) {
    return { model }
  }

  const { issues, members } = maybeWorkspace.value

  const issuesInvolvingActiveMember = Issue.involvingMember(
    issues,
    model.activeMemberId,
  )

  const commentCandidates = Array.isReadonlyArrayNonEmpty(
    issuesInvolvingActiveMember,
  )
    ? issuesInvolvingActiveMember
    : issues

  const maybeIssueToCommentOn = Option.orElse(
    Option.flatMap(maybeIssueId(model.route), issueId =>
      Issue.findById(commentCandidates, issueId),
    ),
    () =>
      Array.match(commentCandidates, {
        onEmpty: Option.none,
        onNonEmpty: candidates =>
          Array.get(candidates, model.activityRequestCount % candidates.length),
      }),
  )

  const maybeTeammate = Array.findFirst(
    members,
    member => member.id !== model.activeMemberId,
  )

  if (Option.isNone(maybeIssueToCommentOn) || Option.isNone(maybeTeammate)) {
    return { model }
  }

  const issueToCommentOn = maybeIssueToCommentOn.value
  const actorId = maybeTeammate.value.id
  const nextActivityRequestCount = model.activityRequestCount + 1

  const maybeIssueToAssign = Array.findFirst(
    issues,
    candidate =>
      !Option.contains(candidate.maybeAssigneeId, model.activeMemberId),
  )

  if (
    nextActivityRequestCount % ACTIVITY_REQUESTS_PER_ASSIGNMENT === 0 &&
    Option.isSome(maybeIssueToAssign)
  ) {
    const issueToAssign = maybeIssueToAssign.value

    return {
      model: modifyFields(model, {
        activityRequestCount: () => nextActivityRequestCount,
      }),
      commands: [
        AssignIssue({
          issueId: issueToAssign.id,
          draft: modifyFields(Issue.toDraft(issueToAssign), {
            maybeAssigneeId: () => Option.some(model.activeMemberId),
          }),
          expectedVersion: issueToAssign.version,
          actorId,
        }),
      ],
    }
  }

  return {
    model: modifyFields(model, {
      activityRequestCount: () => nextActivityRequestCount,
    }),
    commands: [
      AddIssueComment({
        issueId: issueToCommentOn.id,
        authorId: actorId,
        body: Array.getUnsafe(
          ACTIVITY_COMMENT_BODIES,
          model.activityRequestCount % ACTIVITY_COMMENT_BODIES.length,
        ),
      }),
    ],
  }
})
