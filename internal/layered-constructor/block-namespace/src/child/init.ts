import { ChildComposition } from './composition.js'

export const init = ChildComposition.makeInit(count => ({ model: { count } }))
