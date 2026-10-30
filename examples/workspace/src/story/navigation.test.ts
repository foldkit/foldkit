import { Array, Number, Option, Record } from 'effect'
import { UrlRequest } from 'foldkit/navigation'
import { Command, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import * as Url from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'

import { NavigateInternal } from '../application'
import { Message } from '../application'
import {
  type ResolvedModel,
  activeIssueDetail,
  application,
  issueDetailMessage,
  loadWorkspace,
  maybeActiveIssueDetail,
  retainedIssueDetail,
  startAt,
  unsavedIssueDrafts,
  url,
  visibleWorkspaceOf,
} from '../application.fixture'
import {
  draftFromIssue,
  revisionFromIssue,
  savedIssueFromIssue,
} from '../domain/issue'
import { initialWorkspace } from '../domain/seed'
import { IssueDetail } from '../issueDetail/issueDetail'
import { SaveIssue } from '../issueDetail/issueDetail'
import { SaveState } from '../issueDetail/issueDetail'
import {
  ApplicationRoute,
  issueRouter,
  projectRouter,
  routeToPath,
  withIssueId,
} from '../route'

const issueA = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issueB = Option.getOrThrow(Array.get(initialWorkspace.issues, 1))
const issueC = Option.getOrThrow(Array.get(initialWorkspace.issues, 2))

describe('workspace navigation', () => {
  it.effect(
    'navigates to a project and returns there after closing an issue',
    () => {
      const projectRoute = ApplicationRoute.Project({
        projectId: issueB.projectId,
      })
      const projectPath = projectRouter({ projectId: issueB.projectId })

      return story(
        application,
        startAt(),
        loadWorkspace,
        message(
          Message.ClickedLink({
            request: UrlRequest.Internal({ url: url(projectPath) }),
          }),
        ),
        Command.expectExact(
          NavigateInternal({ url: Url.toString(url(projectPath)) }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        message(Message.ChangedUrl({ url: url(projectPath) })),
        message(
          Message.ChangedUrl({
            url: url(routeToPath(withIssueId(projectRoute, issueB.id))),
          }),
        ),
        model(model => {
          expect(model.route).toEqual(
            ApplicationRoute.Project({
              projectId: issueB.projectId,
              issueId: issueB.id,
            }),
          )
          expect(activeIssueDetail(model).issueId).toBe(issueB.id)
        }),
        message(
          issueDetailMessage(issueB.id, IssueDetail.Message.ClickedClose()),
        ),
        Command.expectExact(NavigateInternal({ url: projectPath })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        message(Message.ChangedUrl({ url: url(projectPath) })),
        model(model => {
          expect(model.route).toEqual(
            ApplicationRoute.Project({ projectId: issueB.projectId }),
          )
          expect(Record.values(model.issuePane.issueDetails)).toHaveLength(1)
        }),
      )
    },
  )

  it.effect('retains the editor when leaving the issue route', () =>
    story(
      application,
      startAt(issueRouter({ issueId: issueA.id })),
      loadWorkspace,
      message(Message.ChangedUrl({ url: url('/') })),
      model(model => {
        expect(model.route).toEqual(ApplicationRoute.Issues({}))
        expect(Record.values(model.issuePane.issueDetails)).toHaveLength(1)
      }),
      Command.expectNone(),
    ),
  )

  it.effect(
    'reuses each retained editor when navigating between issues',
    () => {
      const issueBPath = issueRouter({ issueId: issueB.id })
      let maybeIssueADetail: Option.Option<
        ResolvedModel['issuePane']['issueDetails'][string]
      > = Option.none()

      return story(
        application,
        startAt(issueRouter({ issueId: issueA.id })),
        loadWorkspace,
        model(model => {
          maybeIssueADetail = Option.some(activeIssueDetail(model))
        }),
        message(Message.ChangedUrl({ url: url(issueBPath) })),
        model(model => {
          expect(activeIssueDetail(model).issueId).toBe(issueB.id)
          expect(Record.values(model.issuePane.issueDetails)).toHaveLength(2)
        }),
        message(
          Message.ChangedUrl({
            url: url(issueRouter({ issueId: issueA.id })),
          }),
        ),
        model(model => {
          expect(activeIssueDetail(model)).toEqual(
            Option.getOrThrow(maybeIssueADetail),
          )
          expect(Record.values(model.issuePane.issueDetails)).toHaveLength(2)
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect('settles a save while another issue is open', () => {
    const savedIssueSnapshot = modifyFields(issueA, {
      title: () => 'Saved while another issue is open',
      version: Number.increment,
    })

    return story(
      application,
      startAt(issueRouter({ issueId: issueA.id })),
      loadWorkspace,
      message(
        issueDetailMessage(
          issueA.id,
          IssueDetail.Message.UpdatedTitle({
            value: savedIssueSnapshot.title,
          }),
        ),
      ),
      message(
        issueDetailMessage(issueA.id, IssueDetail.Message.RequestedSave()),
      ),
      message(
        Message.ChangedUrl({
          url: url(issueRouter({ issueId: issueB.id })),
        }),
      ),
      model(model => expect(activeIssueDetail(model).issueId).toBe(issueB.id)),
      Command.resolve(
        SaveIssue,
        IssueDetail.Message.SucceededSaveIssue({
          savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          expectedVersion: issueA.version,
        }),
      ),
      model(model => {
        const hiddenEditor = retainedIssueDetail(model, issueA.id)

        expect(activeIssueDetail(model).issueId).toBe(issueB.id)
        expect(hiddenEditor.saveState).toEqual(SaveState.Idle())
        expect(hiddenEditor.baseline).toEqual(
          revisionFromIssue(savedIssueSnapshot),
        )
        expect(visibleWorkspaceOf(model).issues).toContainEqual(
          savedIssueSnapshot,
        )
        expect(unsavedIssueDrafts(model)).toEqual([])
        expect(model.maybeNotice).toEqual(
          Option.some(`${savedIssueSnapshot.identifier} saved`),
        )
      }),
      Command.expectNone(),
      message(
        issueDetailMessage(issueB.id, IssueDetail.Message.ClickedClose()),
      ),
      Command.expectExact(NavigateInternal({ url: '/' })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    )
  })

  it.effect('closes a direct issue URL to All issues', () =>
    story(
      application,
      startAt(issueRouter({ issueId: issueA.id })),
      loadWorkspace,
      message(
        issueDetailMessage(issueA.id, IssueDetail.Message.ClickedClose()),
      ),
      Command.expectExact(NavigateInternal({ url: '/' })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    ),
  )

  it.effect(
    'reconciles every retained editor from a refreshed workspace',
    () => {
      const latestIssueA = modifyFields(issueA, {
        title: () => 'A clean hidden editor receives the refresh',
        version: Number.increment,
      })
      const latestIssueB = modifyFields(issueB, {
        title: () => 'A remote title conflicts with a retained draft',
        version: Number.increment,
      })
      const refreshedWorkspace = modifyFields(initialWorkspace, {
        issues: issues =>
          Array.map(
            Array.filter(issues, issue => issue.id !== issueC.id),
            issue => {
              if (issue.id === issueA.id) {
                return latestIssueA
              }

              if (issue.id === issueB.id) {
                return latestIssueB
              }

              return issue
            },
          ),
      })
      const localTitle = 'Keep this local title'

      return story(
        application,
        startAt(issueRouter({ issueId: issueA.id })),
        loadWorkspace,
        message(
          Message.ChangedUrl({
            url: url(issueRouter({ issueId: issueB.id })),
          }),
        ),
        message(
          issueDetailMessage(
            issueB.id,
            IssueDetail.Message.UpdatedTitle({ value: localTitle }),
          ),
        ),
        message(
          Message.ChangedUrl({
            url: url(issueRouter({ issueId: issueC.id })),
          }),
        ),
        message(Message.ChangedUrl({ url: url('/people') })),
        message(
          Message.SucceededLoadWorkspace({ workspace: refreshedWorkspace }),
        ),
        model(model => {
          const retainedIssueA = retainedIssueDetail(model, issueA.id)
          const retainedIssueB = retainedIssueDetail(model, issueB.id)
          const retainedIssueC = retainedIssueDetail(model, issueC.id)

          expect(maybeActiveIssueDetail(model)).toEqual(Option.none())
          expect(retainedIssueA.baseline).toEqual(
            revisionFromIssue(latestIssueA),
          )
          expect(retainedIssueA.draft).toEqual(draftFromIssue(latestIssueA))
          expect(retainedIssueB.draft.title).toBe(localTitle)
          expect(retainedIssueB.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(latestIssueB)),
          )
          expect(retainedIssueC.baseline).toEqual(revisionFromIssue(issueC))
        }),
        Command.expectNone(),
      )
    },
  )
})
