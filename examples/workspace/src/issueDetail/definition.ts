import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { CommentComposerBlock } from '../commentComposer'
import { Issue, IssueDraft, IssueRevision, RetainedIssueDraft } from '../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
} from '../listbox'
import { RepositoryError } from '../repository'

export const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: { expectedVersion: Schema.Number },
  Failed: { error: Schema.String },
})

export const Model = Schema.Struct({
  issueId: Schema.String,
  baseline: IssueRevision,
  draft: IssueDraft,
  maybeIncomingRevision: Schema.Option(IssueRevision),
  saveState: SaveState,
  commentComposer: CommentComposerBlock.Model,
  statusListbox: StatusListboxBlock.Model,
  priorityListbox: PriorityListboxBlock.Model,
  projectListbox: WorkspaceListboxBlock.Model,
  assigneeListbox: WorkspaceListboxBlock.Model,
})

const ChildInitContext = Schema.Struct({
  issueId: Schema.String,
  commentBody: Schema.String,
})

export const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
  UpdatedDescription: { value: Schema.String },
  SubmittedIssueForm: {},
  ClickedRetrySave: {},
  ClickedReloadIssue: {},
  ClickedClose: {},
  ClickedDiscardChanges: {},
  RequestedSave: {},
  RequestedReportDraft: {},
  InformedOfIssueChange: { issue: Issue },
  SucceededSaveIssue: {
    issue: Issue,
    expectedVersion: Schema.Number,
  },
  FailedSaveIssue: {
    issueId: Schema.String,
    expectedVersion: Schema.Number,
    error: RepositoryError,
  },
})

export const OutMessage = defineMessageUnion({
  Saved: { issue: Issue },
  ObservedIssue: { issue: Issue },
  ChangedDraft: {
    issueId: Schema.String,
    maybeDraft: Schema.Option(RetainedIssueDraft),
  },
  Closed: {},
})

export const IssueDetailDefinition = Block.makeDefinition('IssueDetail', {
  Model,
  Message,
  OutMessage,
  ChildInitContext,
})
