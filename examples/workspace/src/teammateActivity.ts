import { Array, DateTime, Effect, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Comment, IssueDraft, SavedIssue, Workspace } from './domain/domain'
import { WorkspaceRepository } from './services'

const Model = Schema.Struct({
  activityTick: Schema.Number,
  maybeActivityError: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const ActivityContext = Schema.Struct({
  workspace: Workspace,
  activeMemberId: Schema.String,
  maybeActiveIssueId: Schema.Option(Schema.String),
})
type ActivityContext = typeof ActivityContext.Type

const Message = defineMessageUnion({
  RequestedActivity: ActivityContext.fields,
  SucceededAppendActivity: { issueId: Schema.String, comment: Comment },
  FailedAppendActivity: { error: Schema.String },
  SucceededAssignIssue: {
    savedIssue: SavedIssue,
    actorId: Schema.String,
    createdAt: Schema.String,
  },
  FailedAssignIssue: { error: Schema.String },
})

const OutMessage = defineMessageUnion({
  AddedComment: { issueId: Schema.String, comment: Comment },
  AssignedIssue: {
    savedIssue: SavedIssue,
    actorId: Schema.String,
    createdAt: Schema.String,
  },
})

export const AppendActivity = Command.define('AppendActivity', {
  args: {
    issueId: Schema.String,
    authorId: Schema.String,
    body: Schema.String,
  },
  messages: [Message.SucceededAppendActivity, Message.FailedAppendActivity],
})

export const AssignIssue = Command.define('AssignIssue', {
  args: {
    issueId: Schema.String,
    draft: IssueDraft,
    expectedVersion: Schema.Number,
    actorId: Schema.String,
  },
  messages: [Message.SucceededAssignIssue, Message.FailedAssignIssue],
})

export class TeammateActivity extends Block<TeammateActivity>()(
  'TeammateActivity',
  {
    Model,
    Message,
    OutMessage,
    Command: [AppendActivity, AssignIssue],
  },
) {}

export const TeammateActivityLive = TeammateActivity.make(
  Effect.fn(function* () {
    const repository = yield* WorkspaceRepository

    return {
      model: { activityTick: 0, maybeActivityError: Option.none() },

      update: {
        RequestedActivity: simulateActivity,
        SucceededAppendActivity: (model, { issueId, comment }) => ({
          model: modifyFields(model, {
            maybeActivityError: () => Option.none(),
          }),
          outMessage: OutMessage.AddedComment({ issueId, comment }),
        }),
        FailedAppendActivity: (model, { error }) => ({
          model: modifyFields(model, {
            maybeActivityError: () => Option.some(error),
          }),
        }),
        SucceededAssignIssue: (model, { savedIssue, actorId, createdAt }) => ({
          model: modifyFields(model, {
            maybeActivityError: () => Option.none(),
          }),
          outMessage: OutMessage.AssignedIssue({
            savedIssue,
            actorId,
            createdAt,
          }),
        }),
        FailedAssignIssue: (model, { error }) => ({
          model: modifyFields(model, {
            maybeActivityError: () => Option.some(error),
          }),
        }),
      },

      commands: {
        AppendActivity: args =>
          repository.addComment(args).pipe(
            Effect.map(comment =>
              Message.SucceededAppendActivity({
                issueId: args.issueId,
                comment,
              }),
            ),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedAppendActivity({ error: error.message }),
              ),
            ),
          ),
        AssignIssue: args =>
          Effect.gen(function* () {
            const savedIssue = yield* repository.saveIssue(args)
            const createdAt = DateTime.formatIso(yield* DateTime.now)

            return Message.SucceededAssignIssue({
              savedIssue,
              actorId: args.actorId,
              createdAt,
            })
          }).pipe(
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedAssignIssue({ error: error.message }),
              ),
            ),
          ),
      },
    }
  }),
)

const ACTIVITY_EVENTS_PER_ASSIGNMENT = 3
const ACTIVITY_COMMENT_BODIES = [
  'I checked the latest changes. This is ready for another look.',
  'The next iteration is ready. Let me know what you think.',
  'Thanks for the update. I will pick this up next.',
]

const simulateActivity = (
  model: Model,
  { workspace, activeMemberId, maybeActiveIssueId }: ActivityContext,
) => {
  const { issues, members } = workspace

  const memberRelatedIssues = Array.filter(
    issues,
    activityIssue =>
      Option.contains(activityIssue.maybeAssigneeId, activeMemberId) ||
      Array.some(
        activityIssue.comments,
        comment => comment.authorId === activeMemberId,
      ),
  )

  const activityIssueCandidates = Array.isReadonlyArrayNonEmpty(
    memberRelatedIssues,
  )
    ? memberRelatedIssues
    : issues

  const maybeActivityIssue = Option.orElse(
    Option.flatMap(maybeActiveIssueId, activeIssueId =>
      Array.findFirst(
        activityIssueCandidates,
        activityIssue => activityIssue.id === activeIssueId,
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
    member => member.id !== activeMemberId,
  )

  if (Option.isNone(maybeActivityIssue) || Option.isNone(maybeActivityActor)) {
    return { model }
  }

  const activityIssue = maybeActivityIssue.value
  const actorId = maybeActivityActor.value.id
  const nextActivityTick = model.activityTick + 1

  const maybeIssueToAssign = Array.findFirst(
    issues,
    candidate => !Option.contains(candidate.maybeAssigneeId, activeMemberId),
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
            maybeAssigneeId: Option.some(activeMemberId),
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
}
