import { Option } from 'effect'
import type { Url } from 'foldkit/url'

import { LoadWorkspace } from './command'
import { ApplicationComposition } from './composition'
import { IssueMoveState, WorkspaceAsyncData } from './model'
import { resolveIssueCloseRoute, urlToApplicationRoute } from './route'

export const init = ApplicationComposition.makeInit((url: Url) => {
  const route = urlToApplicationRoute(url)

  return {
    model: {
      route,
      issueCloseRoute: resolveIssueCloseRoute(route),
      workspaceAsyncData: WorkspaceAsyncData.Loading(),
      maybeIssueDetailInstance: Option.none(),
      issueDrafts: [],
      maybeBoardInstance: Option.none(),
      maybeNotice: Option.none(),
      maybeActivityError: Option.none(),
      activeMemberId: 'maya',
      activityTick: 0,
      savedViews: [],
      nextSavedViewId: 1,
      issueMoveState: IssueMoveState.Idle(),
    },
    commands: [LoadWorkspace()],
  }
})
