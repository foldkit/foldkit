import { Option } from 'effect'
import { Transition } from 'foldkit/route'
import type { Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'
import { Model, PaintingStatus } from './model'
import { urlToApplicationRoute } from './route'
import { handleTransitionStep } from './steps'

export const init = ApplicationComposition.makeInit((url: Url) => {
  const route = urlToApplicationRoute(url)
  const initialModel = Model.make({
    route,
    transitionLog: [],
    catalogStatus: 'Idle',
    paintingStatus: PaintingStatus.Idle(),
    studioDraft: '',
    maybeSavedDraft: Option.none(),
  })
  return handleTransitionStep(Transition.coldLoad(route))(initialModel)
})
