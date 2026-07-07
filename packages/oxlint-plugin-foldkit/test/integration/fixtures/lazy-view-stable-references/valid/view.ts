import { createLazy } from 'foldkit/html'

import { renderHeader } from './header'

const lazyHeader = createLazy()

export const view = (model: Model) => lazyHeader(renderHeader, [model.title])
