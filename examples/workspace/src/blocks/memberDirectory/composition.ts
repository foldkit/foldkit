import type { Block } from 'foldkit'

import { makeComposition } from './definition'

export const MemberDirectoryComposition = makeComposition()
export type MemberDirectoryViewBuilder = Block.ViewBuilderFor<
  typeof MemberDirectoryComposition
>
