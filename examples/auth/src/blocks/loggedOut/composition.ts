import type { Block } from 'foldkit'

import {
  makeComposition,
  makeOutMessageForward,
  makeRequiredFieldBinding,
} from './block'
import { LoginBlock } from './blocks/login'
import { OutMessage } from './message'

export const LoginModelBinding = makeRequiredFieldBinding(LoginBlock, {
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
