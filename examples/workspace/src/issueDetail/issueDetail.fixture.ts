import { Effect, Layer, Option, Record, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import { message, model } from 'foldkit/story'

import { type Issue } from '../domain/domain'
import { initialWorkspace } from '../domain/seed'
import {
  IssueDetail,
  IssueDetailLive,
  Message,
  OutMessage,
} from './issueDetail'

const HostModel = Schema.Struct({
  issueDetails: Schema.Record(Schema.String, IssueDetail),
})

type ResolvedHostModel = Resolved<typeof HostModel.Type>
type ResolvedIssueDetail = Resolved<IssueDetail>

export const makeIssueDetailHost = (issue: Issue) => {
  class IssueDetailHost extends Block<IssueDetailHost>()('IssueDetailHost', {
    Model: HostModel,
    OutMessage,
  }) {}

  const IssueDetailHostLive = IssueDetailHost.make(
    Effect.fn(function* () {
      const issueDetail = yield* IssueDetail.each('issueDetails')

      return {
        model: {
          issueDetails: { [issue.id]: issueDetail(issue.id, { issue }) },
        },
        update: {
          ...issueDetail.on({
            Saved: (model, outMessage) => ({ model, outMessage }),
            AddedComment: (model, outMessage) => ({ model, outMessage }),
            ReceivedIssue: (model, outMessage) => ({ model, outMessage }),
            Closed: (model, outMessage) => ({ model, outMessage }),
          }),
        },
        view: (model, h) =>
          h.div(
            [],
            [
              ...Record.values(
                Record.map(model.issueDetails, detail =>
                  detail.view({
                    issue,
                    members: initialWorkspace.members,
                    projects: initialWorkspace.projects,
                    authorId: 'maya',
                  }),
                ),
              ),
            ],
          ),
      }
    }),
  ).pipe(Layer.provide(IssueDetailLive))

  const path = ['issueDetails', issue.id]

  const issueDetailOf = (hostModel: ResolvedHostModel): ResolvedIssueDetail =>
    Option.getOrThrow(Record.get(hostModel.issueDetails, issue.id))

  return {
    IssueDetailHostLive,
    path,
    send: (issueDetailMessage: Message) =>
      message(Block.deliver(IssueDetail, path, issueDetailMessage)),
    issueDetail: (assert: (issueDetail: ResolvedIssueDetail) => void) =>
      model<ResolvedHostModel>(hostModel => assert(issueDetailOf(hostModel))),
  }
}
