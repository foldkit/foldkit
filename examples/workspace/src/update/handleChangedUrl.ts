import { Option } from 'effect'
import { Update } from 'foldkit'

import { ApplicationDefinition } from '../definition'
import type { Message } from '../message'
import type { Model } from '../model'
import { urlToApplicationRoute } from '../route'
import { initializeActiveChildren } from './initializeActiveChildren'

export const handleChangedUrl = ApplicationDefinition.makeStep(
  (_model: typeof Model.Type, { url }: typeof Message.ChangedUrl.Type) =>
    Update.combineSteps([
      ApplicationDefinition.makeFieldsStep(() => ({
        route: () => urlToApplicationRoute(url),
        maybeNotice: () => Option.none(),
      })),
      initializeActiveChildren,
    ]),
)
