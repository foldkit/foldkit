import type { Block } from 'foldkit'

import { makeBinding, makeComposition, makeOutMessageForward } from './block'
import { LoginBlock } from './blocks/login'
import { OutMessage } from './message'

export const LoginModelBinding = makeBinding(LoginBlock, {
  field: 'loginModel',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  forward: makeOutMessageForward({
    SucceededLogin: ({ session }) => OutMessage.SucceededLogin({ session }),
  }),
})

export const LoggedOutComposition = makeComposition({
  bindings: [LoginModelBinding],
})
export type LoggedOutViewBuilder = Block.ViewBuilderFor<
  typeof LoggedOutComposition
>
