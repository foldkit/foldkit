import { Option } from 'effect'
import { Update } from 'foldkit'

import { makeFieldsStep, makeStep } from '../definition'
import type { Message } from '../message'
import { urlToApplicationRoute } from '../route'
import { initChildrenStep } from './initChildrenStep'

export const handleChangedUrlStep = makeStep.fromMessage(
  ({ url }: typeof Message.ChangedUrl.Type) =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        route: () => urlToApplicationRoute(url),
        maybeNotice: () => Option.none(),
      })),
      initChildrenStep,
    ]),
)
