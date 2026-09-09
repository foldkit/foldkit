import { createLazy as makeLazy } from 'foldkit/html'

import { renderHeader } from './header'

export const view = (model: Model) => {
  const lazyHeader = makeLazy()
  return lazyHeader(renderHeader, [model.title])
}
