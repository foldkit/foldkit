import { Array, Effect, Option, Record } from 'effect'
import { Command, message, model, steps, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { NavigateInternal, ReplaceInternalUrl } from '../application'
import { Message } from '../application'
import {
  type ResolvedModel,
  activeIssueBoard,
  application,
  issueBoardMessage,
  issueDetailMessage,
  issueListMessage,
  issueMoveMessage,
  loadWorkspace,
  startAt,
  url,
  visibleWorkspaceOf,
} from '../application.fixture'
import { IssueFilters, SavedView } from '../domain/domain'
import { initialWorkspace } from '../domain/seed'
import { IssueBoard } from '../issueBoard'
import { IssueDetail } from '../issueDetail/issueDetail'
import { IssueList } from '../issueList'
import { IssueMove, MoveIssue } from '../issueMove'
import { IssueMoveState } from '../issueMove'
import {
  ApplicationRoute,
  appliedIssueFilters,
  defaultIssueFilters,
  issuesRouter,
  routeToPath,
  savedViewRouter,
  withIssueId,
} from '../route'
import { RepositoryError } from '../services'
import { AppendActivity, TeammateActivity } from '../teammateActivity'

const FAILED_MOVE_ANNOUNCEMENT =
  'Could not save the move. Issue position restored.'

const maybeActiveIssueBoard = (model: ResolvedModel) => {
  const { route } = model

  return ApplicationRoute.guards.Board(route)
    ? Record.get(model.issueBoards, route.projectId)
    : Option.none()
}

const saveView = (name: string, filters: IssueFilters) =>
  steps(
    message(
      issueListMessage(IssueList.Message.UpdatedSavedViewName({ value: name })),
    ),
    message(
      issueListMessage(IssueList.Message.SubmittedSavedView({ filters })),
    ),
  )

describe('Application child policies', () => {
  it.effect('retains one Board instance per project across navigation', () => {
    const issue = Option.getOrThrow(
      Array.findFirst(
        initialWorkspace.issues,
        issue => issue.projectId === 'platform',
      ),
    )

    return Effect.andThen(
      story(
        application,
        startAt('/projects/platform/board'),
        loadWorkspace,
        message(
          issueBoardMessage(
            'platform',
            IssueBoard.Message.InformedOfIssueMoveFailure(),
          ),
        ),
        message(
          Message.ChangedUrl({
            url: url(
              routeToPath(
                ApplicationRoute.Board({
                  projectId: 'platform',
                  issueId: issue.id,
                }),
              ),
            ),
          }),
        ),
        model(model => {
          expect(activeIssueBoard(model).announcement).toBe(
            FAILED_MOVE_ANNOUNCEMENT,
          )
        }),
        message(Message.ChangedUrl({ url: url('/projects/platform/board') })),
        model(model => {
          expect(activeIssueBoard(model).announcement).toBe(
            FAILED_MOVE_ANNOUNCEMENT,
          )
        }),
        message(Message.ChangedUrl({ url: url('/projects/experience/board') })),
        model(model => {
          const experienceBoard = activeIssueBoard(model)

          expect(Record.get(model.issueBoards, 'experience')).toEqual(
            Option.some(experienceBoard),
          )
          expect(experienceBoard).not.toEqual(
            Option.getOrThrow(Record.get(model.issueBoards, 'platform')),
          )
          expect(experienceBoard.announcement).toBe('')
        }),
        message(Message.ChangedUrl({ url: url('/people') })),
        model(model => {
          expect(maybeActiveIssueBoard(model)).toEqual(Option.none())
          expect(Record.values(model.issueBoards)).toHaveLength(2)
        }),
        Command.expectNone(),
      ),
      story(
        application,
        startAt('/projects/missing/board'),
        loadWorkspace,
        model(model => {
          expect(model.issueBoards).toEqual({})
        }),
        Command.expectNone(),
      ),
    )
  })

  it.effect(
    'retains a failed move for retry and uses the refreshed revision',
    () => {
      const issue = Option.getOrThrow(
        Array.findFirst(
          initialWorkspace.issues,
          issue => issue.projectId === 'platform',
        ),
      )
      const latestIssue = modifyFields(issue, {
        title: () => 'A newer revision',
        version: version => version + 1,
      })
      const conflict = IssueMove.Message.FailedMoveIssue({
        issueId: issue.id,
        status: 'Done',
        insertionIndex: 0,
        error: RepositoryError.Conflict({
          issueId: issue.id,
          expectedVersion: issue.version,
          actualVersion: latestIssue.version,
          latestIssue,
          message: 'Reloaded the latest revision.',
        }),
      })

      return story(
        application,
        startAt('/projects/platform/board'),
        loadWorkspace,
        message(issueMoveMessage(conflict)),
        model(model => {
          expect(visibleWorkspaceOf(model).issues).toContainEqual(latestIssue)
          expect(model.issueMove.state).toEqual(
            IssueMoveState.FailedMove({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: 'Reloaded the latest revision.',
            }),
          )
        }),
        message(issueMoveMessage(IssueMove.Message.ClickedRetryMove())),
        Command.expectExact(
          MoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: latestIssue.version,
          }),
        ),
        Command.resolve(
          MoveIssue,
          IssueMove.Message.FailedMoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            error: RepositoryError.Unavailable({
              operation: 'Move',
              message: 'The retry is still unavailable.',
            }),
          }),
        ),
      )
    },
  )

  it.effect(
    'routes Issue List facts through filter Commands and saves the applied filters',
    () => {
      const queriedFilters = IssueFilters.make({
        ...defaultIssueFilters,
        query: 'keyboard',
      })
      const savedFilters = IssueFilters.make({
        ...queriedFilters,
        groupBy: 'Project',
      })
      const clearedFilters = IssueFilters.make({
        ...savedFilters,
        query: '',
      })

      return story(
        application,
        startAt(),
        loadWorkspace,
        message(
          issueListMessage(
            IssueList.Message.UpdatedQuery({ value: 'keyboard' }),
          ),
        ),
        Command.expectExact(
          ReplaceInternalUrl({
            url: issuesRouter({ filters: queriedFilters }),
          }),
        ),
        Command.resolve(
          ReplaceInternalUrl,
          Message.CompletedReplaceInternalUrl(),
        ),
        message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: queriedFilters })),
          }),
        ),
        message(
          issueListMessage(
            IssueList.Message.UpdatedGrouping({ value: 'Project' }),
          ),
        ),
        Command.expectExact(
          NavigateInternal({ url: issuesRouter({ filters: savedFilters }) }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: savedFilters })),
          }),
        ),
        message(
          issueListMessage(
            IssueList.Message.UpdatedSavedViewName({
              value: 'Keyboard work',
            }),
          ),
        ),
        message(
          issueListMessage(
            IssueList.Message.SubmittedSavedView({ filters: savedFilters }),
          ),
        ),
        model(model => {
          expect(model.savedViews).toEqual([
            SavedView.make({
              id: 'view-1',
              name: 'Keyboard work',
              filters: savedFilters,
            }),
          ])
          expect(model.nextSavedViewId).toBe(2)
        }),
        message(issueListMessage(IssueList.Message.RequestedClearFilters())),
        Command.expectExact(
          NavigateInternal({ url: issuesRouter({ filters: clearedFilters }) }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: clearedFilters })),
          }),
        ),
        model(model => {
          expect(appliedIssueFilters(model)).toEqual(clearedFilters)
        }),
      )
    },
  )

  it.effect(
    'restores saved filters and preserves explicit URL overrides',
    () => {
      const savedFilters = IssueFilters.make({
        ...defaultIssueFilters,
        query: 'keyboard',
        groupBy: 'Project',
      })
      const savedView = SavedView.make({
        id: 'view-1',
        name: 'Keyboard work',
        filters: savedFilters,
      })

      return story(
        application,
        startAt(),
        loadWorkspace,
        saveView(savedView.name, savedFilters),
        model(model => {
          expect(model.savedViews).toEqual([savedView])
          expect(model.nextSavedViewId).toBe(2)
        }),
        message(Message.ChangedUrl({ url: url('/views/view-1') })),
        model(model => {
          expect(appliedIssueFilters(model)).toEqual(savedFilters)
        }),
        message(
          Message.ChangedUrl({ url: url('/views/view-1?search=override') }),
        ),
        model(model => {
          expect(appliedIssueFilters(model)).toEqual(
            IssueFilters.make({ ...defaultIssueFilters, query: 'override' }),
          )
        }),
        message(Message.ChangedUrl({ url: url('/views/view-1?filters=1') })),
        model(model => {
          expect(appliedIssueFilters(model)).toEqual(defaultIssueFilters)
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'deletes unrelated and displayed saved views without changing filters',
    () => {
      const savedFilters = IssueFilters.make({
        ...defaultIssueFilters,
        query: 'keyboard',
        groupBy: 'Project',
      })
      const displayedView = SavedView.make({
        id: 'view-1',
        name: 'Keyboard work',
        filters: savedFilters,
      })
      const unrelatedView = SavedView.make({
        id: 'view-2',
        name: 'Other work',
        filters: defaultIssueFilters,
      })
      const displayedPath = savedViewRouter({
        viewId: displayedView.id,
        filters: savedFilters,
      })
      const issuesPath = issuesRouter({ filters: savedFilters })
      const displayingSavedViews = steps(
        loadWorkspace,
        saveView(displayedView.name, savedFilters),
        saveView(unrelatedView.name, defaultIssueFilters),
        message(Message.ChangedUrl({ url: url(displayedPath) })),
        model((model: ResolvedModel) => {
          expect(model.savedViews).toEqual([displayedView, unrelatedView])
          expect(model.nextSavedViewId).toBe(3)
        }),
      )

      return Effect.andThen(
        story(
          application,
          startAt(),
          displayingSavedViews,
          message(Message.ClickedDeleteSavedView({ viewId: unrelatedView.id })),
          model(model => {
            expect(model.savedViews).toEqual([displayedView])
            expect(model.route).toEqual(
              ApplicationRoute.SavedView({
                viewId: displayedView.id,
                filters: savedFilters,
              }),
            )
            expect(appliedIssueFilters(model)).toEqual(savedFilters)
          }),
          Command.expectNone(),
        ),
        story(
          application,
          startAt(),
          displayingSavedViews,
          message(Message.ClickedDeleteSavedView({ viewId: displayedView.id })),
          model(model => {
            expect(model.savedViews).toEqual([unrelatedView])
            expect(appliedIssueFilters(model)).toEqual(savedFilters)
          }),
          Command.expectExact(NavigateInternal({ url: issuesPath })),
          Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        ),
      )
    },
  )

  it.effect(
    'deleting a saved view behind an issue preserves its filters for close',
    () => {
      const savedFilters = IssueFilters.make({
        ...defaultIssueFilters,
        query: 'keyboard',
        groupBy: 'Project',
      })
      const changedFilters = IssueFilters.make({
        ...savedFilters,
        query: 'unsaved filters',
      })
      const savedView = SavedView.make({
        id: 'view-1',
        name: 'Keyboard work',
        filters: savedFilters,
      })
      const savedViewRoute = ApplicationRoute.SavedView({
        viewId: savedView.id,
        filters: changedFilters,
      })
      const issuePath = routeToPath(withIssueId(savedViewRoute, 'issue-102'))
      const issuesRoute = ApplicationRoute.Issues({ filters: changedFilters })
      const issuesPath = issuesRouter({ filters: changedFilters })
      const repairedIssuePath = routeToPath(
        withIssueId(issuesRoute, 'issue-102'),
      )

      return story(
        application,
        startAt(),
        loadWorkspace,
        saveView(savedView.name, savedFilters),
        message(Message.ChangedUrl({ url: url(issuePath) })),
        model(model => {
          expect(model.savedViews).toEqual([savedView])
        }),
        message(Message.ClickedDeleteSavedView({ viewId: savedView.id })),
        Command.expectExact(ReplaceInternalUrl({ url: repairedIssuePath })),
        model(model => {
          expect(model.savedViews).toEqual([])

          expect(model.route).toEqual(
            ApplicationRoute.Issues({
              filters: changedFilters,
              issueId: 'issue-102',
            }),
          )
          expect(appliedIssueFilters(model)).toEqual(changedFilters)
        }),
        Command.resolve(
          ReplaceInternalUrl,
          Message.CompletedReplaceInternalUrl(),
        ),
        message(Message.ChangedUrl({ url: url(repairedIssuePath) })),
        message(
          issueDetailMessage('issue-102', IssueDetail.Message.ClickedClose()),
        ),
        Command.expectExact(NavigateInternal({ url: issuesPath })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      )
    },
  )

  it.effect('requests teammate activity from the always-on stream fact', () =>
    story(
      application,
      startAt(),
      loadWorkspace,
      message(Message.TickedActivityStream()),
      model(model => {
        expect(model.teammateActivity.activityTick).toBe(1)
      }),
      Command.expectExact(
        AppendActivity({
          issueId: 'issue-101',
          authorId: 'alex',
          body: 'I checked the latest changes. This is ready for another look.',
        }),
      ),
      Command.resolve(
        AppendActivity,
        TeammateActivity.Message.FailedAppendActivity({
          error: 'Activity is unavailable.',
        }),
      ),
    ),
  )
})
