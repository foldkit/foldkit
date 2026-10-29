import { Option } from 'effect'

import { ApiReferenceComposition } from './composition'
import { type ApiData, ApiDataAsyncData } from './domain'
import { Model, disclosuresForApiData } from './model'
import { LoadApiData } from './update'

export const init = ApiReferenceComposition.makeInit(
  (maybeApiData: Option.Option<ApiData> = Option.none()) => ({
    model: Option.match(maybeApiData, {
      onNone: () =>
        Model.make({
          apiData: ApiDataAsyncData.Loading(),
          disclosures: {},
        }),
      onSome: apiData =>
        Model.make({
          apiData: ApiDataAsyncData.Refreshing({ data: apiData }),
          disclosures: disclosuresForApiData(apiData),
        }),
    }),
    commands: [LoadApiData()],
  }),
)
