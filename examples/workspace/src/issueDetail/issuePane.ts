import { clsx } from 'clsx'
import { Array, Effect, Layer, Option, Record, Schema, pipe } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Comment, Issue, SavedIssue, type Workspace } from '../domain/domain'
import { protectUnsavedChanges } from '../domain/draftProtection'
import { missingPage } from '../domain/missingPage'
import { IssueDetail, IssueDetailLive, maybeDraftSummary } from './issueDetail'

const Model = Schema.Struct({
  issueDetails: Schema.Record(Schema.String, IssueDetail),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedOpen: { issue: Issue },
  InformedOfIssueChange: { issue: Issue },
  InformedOfIssues: { issues: Schema.Array(Issue) },
})

const OutMessage = defineMessageUnion({
  Saved: { savedIssue: SavedIssue },
  AddedComment: { issueId: Schema.String, comment: Comment },
  ReceivedIssue: { issue: Issue },
  Closed: {},
})

type ViewInput = Readonly<{
  issueId: string
  isFullPage: boolean
  workspace: Workspace
  authorId: string
}>

export class IssuePane extends Block<IssuePane, void, ViewInput>()(
  'IssuePane',
  { Model, Message, OutMessage },
) {}

export const IssuePaneLive = IssuePane.make(
  Effect.fn(function* () {
    const issueDetail = yield* IssueDetail.each('issueDetails')

    return {
      model: { issueDetails: {} },

      update: {
        RequestedOpen: (model, { issue }) =>
          Record.has(model.issueDetails, issue.id)
            ? { model }
            : {
                model: modifyFields(model, {
                  issueDetails: Record.set(
                    issue.id,
                    issueDetail(issue.id, { issue }),
                  ),
                }),
              },
        InformedOfIssueChange: (model, { issue }) => ({
          model,
          messages: informIssueChanged(model, issue),
        }),
        InformedOfIssues: (model, { issues }) => ({
          model,
          messages: Array.flatMap(issues, issue =>
            informIssueChanged(model, issue),
          ),
        }),
        ...issueDetail.on<Model>({
          Saved: (model, { savedIssue }) => ({
            model,
            outMessage: OutMessage.Saved({ savedIssue }),
          }),
          AddedComment: (model, { issueId, comment }) => ({
            model,
            outMessage: OutMessage.AddedComment({ issueId, comment }),
          }),
          ReceivedIssue: (model, { issue }) => ({
            model,
            outMessage: OutMessage.ReceivedIssue({ issue }),
          }),
          Closed: model => ({ model, outMessage: OutMessage.Closed() }),
        }),
      },

      subscriptions: {
        draftExitGuard: {
          dependencies: model =>
            Array.isReadonlyArrayNonEmpty(unsavedIssueDrafts(model)),
          stream: (isProtecting: boolean) =>
            protectUnsavedChanges({ isProtecting }),
        },
      },

      view: (model, h, { issueId, isFullPage, workspace, authorId }) =>
        Option.match(
          Option.all([
            Record.get(model.issueDetails, issueId),
            Array.findFirst(workspace.issues, issue => issue.id === issueId),
          ]),
          {
            onNone: () =>
              missingPage(
                'Issue not found',
                'Choose another issue from the list.',
                h,
              ),
            onSome: ([detail, issue]) =>
              h.aside(
                [
                  h.Class(
                    clsx(
                      'min-h-0 w-full flex-1 overflow-y-auto overscroll-contain bg-slate-50/70',
                      isFullPage
                        ? 'mx-auto max-w-3xl'
                        : 'xl:w-[430px] xl:flex-none xl:border-l xl:border-slate-200',
                    ),
                  ),
                ],
                [
                  detail.view({
                    issue,
                    projects: workspace.projects,
                    members: workspace.members,
                    authorId,
                  }),
                ],
              ),
          },
        ),
    }
  }),
).pipe(Layer.provide(IssueDetailLive))

export const unsavedIssueDrafts = (model: Model) =>
  pipe(
    model.issueDetails,
    Record.values,
    Array.map(detail =>
      maybeDraftSummary(detail.model, detail.model.commentComposer.model),
    ),
    Array.getSomes,
  )

const informIssueChanged = (model: Model, issue: Issue) =>
  Option.match(Record.get(model.issueDetails, issue.id), {
    onNone: () => [],
    onSome: detail => [
      detail.send(IssueDetail.Message.InformedOfIssueChange({ issue })),
    ],
  })
