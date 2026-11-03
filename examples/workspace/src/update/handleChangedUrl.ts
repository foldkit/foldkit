import { Option } from 'effect'
import { Update } from 'foldkit'

import { makeFieldsStep, makeStep } from '../definition'
import type { ChangedUrl } from '../message'
import { urlToApplicationRoute } from '../route'
import { initChildren } from './initChildren'

export const handleChangedUrl = makeStep.fromMessage(({ url }: ChangedUrl) =>
  Update.combineSteps([
    makeFieldsStep(() => ({
      route: () => urlToApplicationRoute(url),
      maybeNotice: () => Option.none(),
    })),
    initChildren,
  ]),
)
