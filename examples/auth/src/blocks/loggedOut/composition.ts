import type { Block } from 'foldkit'

import { LoginBlock } from './blocks/login'
import { LoggedOutDefinition } from './definition'
import { OutMessage } from './message'

export const LoginModelBinding = LoggedOutDefinition.makeBinding(LoginBlock, {
  field: 'loginModel',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  forward: LoggedOutDefinition.makeOutMessageForward({
    SucceededLogin: ({ session }) => OutMessage.SucceededLogin({ session }),
  }),
})

export const LoggedOutComposition = LoggedOutDefinition.makeComposition({
  bindings: [LoginModelBinding],
})
export type LoggedOutViewBuilder = Block.ViewBuilderFor<
  typeof LoggedOutComposition
>
