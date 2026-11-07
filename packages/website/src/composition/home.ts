import { Option } from 'effect'

import {
  makeCommandsStep,
  makeFieldsStep,
  makeOptionalFieldBinding,
  makeOutMessageFold,
} from '../block'
import { HomeBlock } from '../blocks'
import { LoadPlayground } from '../command'
import { ApplicationRoute } from '../route'

export const MaybeHomeBinding = makeOptionalFieldBinding(HomeBlock, {
  field: 'maybeHome',
  init: {
    contextToArgs: ({ route }) =>
      Option.liftPredicate(route, ApplicationRoute.guards.Home).pipe(
        Option.as([]),
      ),
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(HomeBlock, {
    SelectedPlaygroundExample: ({ exampleSlug }) =>
      makeCommandsStep(() => [LoadPlayground({ exampleSlug })]),
    UpdatedNewsletterEmail: ({ value }) =>
      makeFieldsStep(() => ({
        newsletterEmail: () => value,
      })),
  }),
})
