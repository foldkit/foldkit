import { BlockPageComposition } from './composition'
export const init = BlockPageComposition.makeInit(() => ({
  model: {
    isMapMessagesUnderHoodOpen: false,
  },
}))
