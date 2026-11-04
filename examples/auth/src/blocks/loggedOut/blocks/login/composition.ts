import type { Block } from 'foldkit'

import { LoginBlock } from './definition'

export const LoginComposition = LoginBlock.makeComposition()
export type LoginViewBuilder = Block.ViewBuilderFor<typeof LoginComposition>
