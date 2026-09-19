import { Context } from 'effect'

export class DialogRuntime extends Context.Service<
  DialogRuntime,
  {
    readonly register: (id: string) => void
    readonly unregister: (id: string) => void
  }
>()('@foldkit/DialogRuntime') {}
