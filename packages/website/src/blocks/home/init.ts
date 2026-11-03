import { HomeComposition } from './composition'

export const init = HomeComposition.makeInit(() => ({
  model: {
    activeDemoTab: 'AsyncCounter',
  },
}))
