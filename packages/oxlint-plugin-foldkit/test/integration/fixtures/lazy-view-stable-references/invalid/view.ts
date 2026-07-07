import { createLazy } from 'foldkit/html'

import { renderHeader } from './header'

export const view = (model: Model) => {
  const lazyHeader = createLazy()
  return lazyHeader(renderHeader, [model.title])
}
