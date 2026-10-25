import { Option } from 'effect'
import { Update } from 'foldkit'
import { Transition } from 'foldkit/route'

import { IssueBoardBinding } from '../composition'
import { ApplicationDefinition } from '../definition'
import type { Message } from '../message'
import type { Model } from '../model'
import { backgroundRoute } from '../navigation'
import { ApplicationRoute, urlToApplicationRoute } from '../route'
import { initializeActiveChildren } from './initializeActiveChildren'

const cancelBoardInteractionOnExit = (
  transition: Transition.Transition<typeof ApplicationRoute.Type>,
) =>
  Transition.match(transition, 'Board', {
    Entered: ApplicationDefinition.makeNoopStep,
    Exited: ({ projectId }) =>
      IssueBoardBinding.informNavigationAway(projectId),
    Stayed: ({ previousRoute, nextRoute }) =>
      previousRoute.projectId === nextRoute.projectId
        ? ApplicationDefinition.makeNoopStep()
        : IssueBoardBinding.informNavigationAway(previousRoute.projectId),
    Unrelated: ApplicationDefinition.makeNoopStep,
  })

export const handleChangedUrl = ApplicationDefinition.makeStep(
  (model: typeof Model.Type, { url }: typeof Message.ChangedUrl.Type) => {
    const nextRoute = urlToApplicationRoute(url)
    const backgroundTransition = Transition.make(
      backgroundRoute(model.route),
      backgroundRoute(nextRoute),
    )

    return Update.combineSteps([
      cancelBoardInteractionOnExit(backgroundTransition),
      ApplicationDefinition.makeFieldsStep(() => ({
        route: () => nextRoute,
        maybeNotice: () => Option.none(),
      })),
      initializeActiveChildren,
    ])
  },
)
