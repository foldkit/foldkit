import type { Block } from 'foldkit'

import { LoginBlock } from './blocks/login'
import { LoggedOutBlock } from './definition'
import { OutMessage } from './message'

export const LoginModelBinding = LoggedOutBlock.makeBinding(LoginBlock, {
  field: 'loginModel',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  forward: LoggedOutBlock.makeOutMessageForward({
    SucceededLogin: ({ session }) => OutMessage.SucceededLogin({ session }),
  }),
})

export const LoggedOutComposition = LoggedOutBlock.makeComposition({
  bindings: [LoginModelBinding],
})
export type LoggedOutViewBuilder = Block.ViewBuilderFor<
  typeof LoggedOutComposition
>
