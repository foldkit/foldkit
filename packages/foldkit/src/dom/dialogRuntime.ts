import { Context } from 'effect'

/** Tracks dialog ownership and admission for one running application. */
export class DialogRuntime extends Context.Service<
  DialogRuntime,
  {
    readonly isActive: () => boolean
    readonly register: (id: string) => void
    readonly unregister: (id: string) => void
  }
>()('@foldkit/DialogRuntime') {}
