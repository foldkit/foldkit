import { Option, Schema } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

export const Failure = Schema.Struct({
  reason: Schema.String,
  maybeProcessOutput: Schema.Option(Schema.String),
})
export type Failure = typeof Failure.Type

export const State = Schema.Struct({
  ...Failure.fields,
  isProcessOutputOpen: Schema.Boolean,
})
export type State = typeof State.Type

export const start = (failure: Failure): State => ({
  ...failure,
  isProcessOutputOpen: false,
})

export const setProcessOutputOpen = (state: State, isOpen: boolean): State =>
  modifyFields(state, { isProcessOutputOpen: () => isOpen })

const processOutputView = <Message>(
  processOutput: string,
  isOpen: boolean,
  toToggledMessage: (isOpen: boolean) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.details(
    [
      h.Open(isOpen),
      h.OnToggle(toToggledMessage),
      h.Class('w-full mt-4 text-left'),
    ],
    [
      h.summary(
        [h.Class('text-sm text-gray-600 cursor-pointer')],
        ['Process output'],
      ),
      h.pre(
        [
          h.Class(
            'mt-2 max-h-64 overflow-auto font-mono text-xs text-gray-600 whitespace-pre-wrap break-words',
          ),
        ],
        [processOutput],
      ),
    ],
  )

export const view = <Message>(
  state: State,
  toToggledMessage: (isOpen: boolean) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex-1 flex items-center justify-center px-6 py-20 text-center')],
    [
      h.div(
        [h.Class('w-full max-w-xl flex flex-col items-center min-w-0')],
        [
          h.div(
            [h.Class('text-base font-semibold text-gray-900 mb-2')],
            ['Playground failed to load'],
          ),
          h.div(
            [
              h.Class(
                'w-full max-h-64 overflow-auto text-sm text-gray-600 whitespace-pre-wrap break-words',
              ),
            ],
            [state.reason],
          ),
          ...Option.match(state.maybeProcessOutput, {
            onNone: () => [],
            onSome: processOutput => [
              processOutputView(
                processOutput,
                state.isProcessOutputOpen,
                toToggledMessage,
                h,
              ),
            ],
          }),
        ],
      ),
    ],
  )
