import { Option } from 'effect'

import { ApplicationBlock } from './application/definition'
import { DetailsBlock } from './details'
import { SearchBlock } from './search'

const foldSearchOutMessage = ApplicationBlock.makeOutMessageFold(SearchBlock, {
  SelectedResult: ({ resultId }, { modelBeforeUpdate }) =>
    Option.isSome(modelBeforeUpdate.maybeDetails)
      ? MaybeDetailsBinding.informResultChanged({ resultId })
      : MaybeDetailsBinding.requestOpen({ resultId }),
})

export const SearchBinding = ApplicationBlock.makeBinding(SearchBlock, {
  field: 'search',
}).withOutMessagePolicy({ fold: foldSearchOutMessage })

export const MaybeDetailsBinding = ApplicationBlock.makeBinding(DetailsBlock, {
  field: 'maybeDetails',
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [SearchBinding, MaybeDetailsBinding],
})
