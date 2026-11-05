import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const LoginComposition = makeComposition()
export type LoginViewBuilder = Block.ViewBuilderFor<typeof LoginComposition>
