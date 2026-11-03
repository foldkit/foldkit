import type { Block } from 'foldkit'

import { LoginDefinition } from './definition'

export const LoginComposition = LoginDefinition.makeComposition()
export type LoginViewBuilder = Block.ViewBuilderFor<typeof LoginComposition>
