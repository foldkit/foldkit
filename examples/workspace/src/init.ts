import { Option } from 'effect'
import type { Url } from 'foldkit/url'

import { LoadWorkspace } from './command'
import { ApplicationComposition } from './composition'
import { Issue } from './domain'
import { WorkspaceAsyncData } from './model'
import { urlToApplicationRoute } from './route'

export const init = ApplicationComposition.makeInit((url: Url) => {
  const route = urlToApplicationRoute(url)

  return {
    model: {
      route,
      workspaceAsyncData: WorkspaceAsyncData.Loading(),
      issueDetails: {},
      issueBoards: {},
      projectSettings: {},
      maybeNotice: Option.none(),
      maybeActivityError: Option.none(),
      activeMemberId: 'maya',
      activityRequestCount: 0,
      savedViews: [],
      nextSavedViewNumber: 1,
      issueMoveState: Issue.MoveState.Idle(),
    },
    commands: [LoadWorkspace()],
  }
})
