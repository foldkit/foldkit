import { Option } from 'effect'
import type { Url } from 'foldkit/url'

import { LoadWorkspace } from './command'
import { ApplicationComposition } from './composition'
import { WorkspaceAsyncData } from './model'
import { IssueMoveState } from './optimistic'
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
      activityTick: 0,
      savedViews: [],
      nextSavedViewId: 1,
      issueMoveState: IssueMoveState.Idle(),
    },
    commands: [LoadWorkspace()],
  }
})
