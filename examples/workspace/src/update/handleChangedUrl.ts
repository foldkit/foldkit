import { Option } from 'effect'
import { Update } from 'foldkit'

import { makeFieldsStep, makeStep } from '../definition'
import type { Message } from '../message'
import type { Model } from '../model'
import { urlToApplicationRoute } from '../route'
import { initializeActiveChildrenStep } from './initializeActiveChildren'

export const handleChangedUrlStep = makeStep(
  (_model: typeof Model.Type, { url }: typeof Message.ChangedUrl.Type) =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        route: () => urlToApplicationRoute(url),
        maybeNotice: () => Option.none(),
      })),
      initializeActiveChildrenStep,
    ]),
)
