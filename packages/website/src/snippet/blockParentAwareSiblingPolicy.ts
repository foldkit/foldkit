import { Option } from 'effect'

import {
  makeOutMessageFold,
  makeBinding,
  makeComposition,
} from './application/block'
import { DetailsBlock } from './details'
import { SearchBlock } from './search'

const foldSearchOutMessage = makeOutMessageFold(SearchBlock, {
  SelectedResult: ({ resultId }, { modelBeforeUpdate }) =>
    Option.isSome(modelBeforeUpdate.maybeDetails)
      ? MaybeDetailsBinding.informResultChanged({ resultId })
      : MaybeDetailsBinding.requestOpen({ resultId }),
})

export const SearchBinding = makeBinding(SearchBlock, {
  field: 'search',
}).withOutMessagePolicy({ fold: foldSearchOutMessage })

export const MaybeDetailsBinding = makeBinding(DetailsBlock, {
  field: 'maybeDetails',
})

export const ApplicationComposition = makeComposition({
  bindings: [SearchBinding, MaybeDetailsBinding],
})
