import { Option } from 'effect'
import { Block, Runtime } from 'foldkit'

import { ApplicationBlock } from './block'
import { ApplicationComposition } from './composition'
import { Model } from './model'

type ApplicationDispatchMessage = Block.ExecutableOf<
  typeof ApplicationBlock
>['Message']['Type']

type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const statusView = (model: Model, h: ApplicationViewBuilder) =>
  h.output([], [model.status])

export const reportCrash = ({
  error,
  message,
}: Runtime.CrashContext<Model, ApplicationDispatchMessage>) => {
  reportError(error, {
    message: Option.getOrUndefined(message),
  })
}
