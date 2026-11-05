import { Option } from 'effect'
import { Update } from 'foldkit'

import { makeFieldsStep, makeStep } from '../block'
import type { ChangedUrl } from '../message'
import { urlToApplicationRoute } from '../route'
import { initChildren } from './initChildren'

// were we going to make this generic like fromMessage<ChangedUrl>, same with
// just makeStep?
export const handleChangedUrl = makeStep.fromMessage(({ url }: ChangedUrl) =>
  Update.combineSteps([
    makeFieldsStep(() => ({
      route: () => urlToApplicationRoute(url),
      maybeNotice: () => Option.none(),
    })),
    initChildren,
  ]),
)
