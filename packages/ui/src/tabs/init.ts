import { Option } from 'effect'

import { TabsComposition } from './composition.js'

/** @internal Canonical Tabs implementation. */
export const init = TabsComposition.makeInit(({ id, activationMode }) => ({
  model: {
    id,
    maybeFocusedIndex: Option.none(),
    activationMode: activationMode ?? 'Automatic',
  },
}))
