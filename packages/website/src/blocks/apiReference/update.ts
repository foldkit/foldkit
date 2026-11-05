import { Record, Result } from 'effect'
import { AsyncData } from 'foldkit'

import { makeFieldsStep } from './block'
import { ApiReferenceComposition } from './composition'
import { ApiDataAsyncData } from './domain'
import { disclosuresForApiData } from './model'

export const update = ApiReferenceComposition.makeUpdate({
  SucceededLoadApiData: makeFieldsStep.fromMessage(({ apiData }) => ({
    apiData: () => ApiDataAsyncData.Success({ data: apiData }),
    disclosures: disclosures =>
      Record.union(
        disclosures,
        disclosuresForApiData(apiData),
        isOpen => isOpen,
      ),
  })),

  FailedLoadApiData: makeFieldsStep.fromMessage(({ error }) => ({
    apiData: apiData => AsyncData.settle(apiData, Result.fail(error)),
  })),

  ToggledSignature: makeFieldsStep.fromMessage(({ id, isOpen }) => ({
    disclosures: disclosures => Record.set(disclosures, id, isOpen),
  })),
})
