import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { LoadApiData } from './command'
import { ApiReferenceComposition } from './composition'
import { makeStep } from './definition'

const refreshApiData = makeStep(model =>
  Option.match(
    AsyncData.isStale(model.apiData)
      ? AsyncData.revalidate(model.apiData)
      : AsyncData.loadIfMissing(model.apiData),
    {
      onNone: () => ({ model }),
      onSome: apiData => ({
        model: modifyFields(model, { apiData: () => apiData }),
        commands: [LoadApiData()],
      }),
    },
  ),
)

export const receive = ApiReferenceComposition.makeReceive({
  InformedOfRouteChange: refreshApiData,
})
