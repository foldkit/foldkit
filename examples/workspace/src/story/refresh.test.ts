import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { LoadWorkspace } from '../application'
import { Message } from '../application'
import {
  activeIssueDetail,
  application,
  issueDetailMessage,
  loadWorkspace,
  startAt,
  visibleWorkspaceOf,
  workspacePageMessage,
} from '../application.fixture'
import { revisionFromIssue } from '../domain/issue'
import { initialWorkspace } from '../domain/seed'
import { IssueDetail } from '../issueDetail/issueDetail'
import { issueRouter } from '../route'
import { WorkspacePage } from '../workspacePage'

const issueA = Option.getOrThrow(Array.head(initialWorkspace.issues))

describe('when refreshing the workspace with an unsaved issue draft', () => {
  it.effect(
    'keeps the canonical issue and editable draft after a failed refresh',
    () => {
      const title = 'Keep this draft while refreshing'
      const error = 'The workspace is temporarily unavailable.'

      return story(
        application,
        startAt(issueRouter({ issueId: issueA.id })),
        loadWorkspace,
        message(
          issueDetailMessage(
            issueA.id,
            IssueDetail.Message.UpdatedTitle({ value: title }),
          ),
        ),
        message(workspacePageMessage(WorkspacePage.Message.ClickedRetryLoad())),
        Command.expectExact(LoadWorkspace()),
        model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Refreshing')
          expect(visibleWorkspaceOf(model).issues).toContainEqual(issueA)

          expect(activeIssueDetail(model).draft.title).toBe(title)
        }),
        Command.resolve(LoadWorkspace, Message.FailedLoadWorkspace({ error })),
        model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Stale')
          expect(AsyncData.getError(model.workspaceAsyncData)).toEqual(
            Option.some(error),
          )
          expect(visibleWorkspaceOf(model).issues).toContainEqual(issueA)

          expect(activeIssueDetail(model).draft.title).toBe(title)
          expect(activeIssueDetail(model).maybeIncomingRevision).toEqual(
            Option.none(),
          )
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'publishes the refreshed issue and offers its revision without replacing the draft',
    () => {
      const title = 'Keep this unsaved title'
      const latestIssue = modifyFields(issueA, {
        title: () => 'A newer title loaded from the repository',
        version: version => version + 1,
      })
      const latestWorkspace = modifyFields(initialWorkspace, {
        issues: Array.map(issue =>
          issue.id === latestIssue.id ? latestIssue : issue,
        ),
      })

      return story(
        application,
        startAt(issueRouter({ issueId: issueA.id })),
        loadWorkspace,
        message(
          issueDetailMessage(
            issueA.id,
            IssueDetail.Message.UpdatedTitle({ value: title }),
          ),
        ),
        message(workspacePageMessage(WorkspacePage.Message.ClickedRetryLoad())),
        Command.expectExact(LoadWorkspace()),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: latestWorkspace }),
        ),
        model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Success')
          expect(visibleWorkspaceOf(model).issues).toContainEqual(latestIssue)

          expect(activeIssueDetail(model).draft.title).toBe(title)
          expect(activeIssueDetail(model).maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(latestIssue)),
          )
        }),
        Command.expectNone(),
      )
    },
  )
})
