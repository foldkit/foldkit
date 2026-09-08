import { clsx } from 'clsx'
import { Schema } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { defineTaggedUnion } from 'foldkit/schema'

export const State = defineTaggedUnion({
  Loading: { previewUrl: Schema.String },
  Loaded: { previewUrl: Schema.String },
})
export type State = typeof State.Type

export const start = (previewUrl: string): State =>
  State.Loading({ previewUrl })

export const load = (state: State, previewUrl: string): State => {
  if (state.previewUrl !== previewUrl || state._tag === 'Loaded') {
    return state
  } else {
    return State.Loaded({ previewUrl })
  }
}

export const view = <Message>(
  state: State,
  loadedMessage: Message,
  loadingView: Html,
  h: HtmlBuilder<Message>,
): Html => {
  const isLoaded = state._tag === 'Loaded'
  return h.div(
    [h.Class('relative flex-1 min-w-0 min-h-0'), h.AriaBusy(!isLoaded)],
    [
      h.keyed('iframe')(state.previewUrl, [
        h.Src(state.previewUrl),
        h.Allow('cross-origin-isolated'),
        h.Class(
          clsx(
            'w-full h-full border-0',
            isLoaded
              ? 'opacity-100'
              : 'invisible opacity-0 pointer-events-none',
          ),
        ),
        h.Title('Foldkit Playground'),
        h.Inert(!isLoaded),
        h.AriaHidden(!isLoaded),
        h.Tabindex(isLoaded ? 0 : -1),
        h.OnLoad(loadedMessage),
      ]),
      h.div(
        [h.Class(clsx('absolute inset-0', isLoaded ? 'hidden' : 'flex'))],
        [loadingView],
      ),
    ],
  )
}
