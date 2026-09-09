import { createLazy } from 'foldkit/html'

import { renderHeader } from './header'

const lazyHeader = createLazy()

const stableHeader = () => undefined

export const view = (model: Model) => lazyHeader(renderHeader, [model.title])

export const makeLocal = (createLazy: () => () => unknown) => {
  const localLazy = createLazy()

  return localLazy()
}

export const callShadow = (
  lazyHeader: (view: () => unknown, dependencies: ReadonlyArray<unknown>) =>
    unknown,
) => lazyHeader(() => undefined, [])

export const blockShadow = () => {
  {
    const stableHeader = 'shadow'
    void stableHeader
  }

  return lazyHeader(stableHeader, [])
}
