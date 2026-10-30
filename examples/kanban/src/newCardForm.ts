import { Effect, Equal, Option, Schema, String, flow } from 'effect'
import { Block, Command, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

const ADD_CARD_INPUT_ID = 'add-card-input'

const Model = Schema.Struct({
  maybeColumnId: Schema.Option(Schema.String),
  title: Schema.String,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedOpen: { columnId: Schema.String },
  RequestedClose: {},
  ChangedNewCardTitle: { value: Schema.String },
  SubmittedNewCard: {},
  CancelledNewCard: {},
  CompletedFocusAddCardInput: {},
})

const OutMessage = defineMessageUnion({
  SubmittedCard: { columnId: Schema.String, title: Schema.String },
})

export const FocusAddCardInput = Command.define('FocusAddCardInput', {
  messages: [Message.CompletedFocusAddCardInput],
})

export class NewCardForm extends Block<NewCardForm>()('NewCardForm', {
  Model,
  Message,
  OutMessage,
  Command: [FocusAddCardInput],
}) {}

const closedModel: Model = {
  maybeColumnId: Option.none(),
  title: '',
}

export const NewCardFormLive = NewCardForm.make(
  Effect.fn(function* () {
    return {
      model: closedModel,

      update: {
        RequestedOpen: (_model, { columnId }) => ({
          model: {
            maybeColumnId: Option.some(columnId),
            title: '',
          },
          commands: [FocusAddCardInput()],
        }),

        RequestedClose: () => ({ model: closedModel }),

        ChangedNewCardTitle: (model, { value }) => ({
          model: modifyFields(model, { title: () => value }),
        }),

        SubmittedNewCard: model =>
          Option.match(model.maybeColumnId, {
            onNone: () => ({ model }),
            onSome: columnId => {
              const title = String.trim(model.title)

              if (String.isEmpty(title)) {
                return { model }
              }

              return {
                model,
                outMessage: OutMessage.SubmittedCard({ columnId, title }),
              }
            },
          }),

        CancelledNewCard: () => ({ model: closedModel }),

        CompletedFocusAddCardInput: model => ({ model }),
      },

      commands: {
        FocusAddCardInput: () =>
          Dom.focus(`#${ADD_CARD_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusAddCardInput()),
          ),
      },

      view: (model, h) =>
        h.form(
          [
            h.Class('flex flex-col gap-2'),
            h.OnSubmit(Message.SubmittedNewCard()),
          ],
          [
            h.label(
              [h.For(ADD_CARD_INPUT_ID), h.Class('sr-only')],
              ['New card title'],
            ),
            Input.view(
              {
                id: ADD_CARD_INPUT_ID,
                onInput: value => Message.ChangedNewCardTitle({ value }),
                value: model.title,
                placeholder: 'Card title...',
                toView: attributes =>
                  h.input([
                    ...attributes.input,
                    h.Class(
                      'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none',
                    ),
                    h.OnKeyDownPreventDefault(
                      flow(
                        Option.liftPredicate(Equal.equals('Escape')),
                        Option.map(() => Message.CancelledNewCard()),
                      ),
                    ),
                  ]),
              },
              h,
            ),
            h.div(
              [h.Class('flex gap-2 justify-end')],
              [
                Button.view(
                  {
                    onClick: Message.CancelledNewCard(),
                    toView: attributes =>
                      h.button(
                        [
                          ...attributes.button,
                          h.Class(
                            'rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer',
                          ),
                        ],
                        ['Cancel'],
                      ),
                  },
                  h,
                ),
                Button.view(
                  {
                    type: 'submit',
                    toView: attributes =>
                      h.button(
                        [
                          ...attributes.button,
                          h.Class(
                            'rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors cursor-pointer',
                          ),
                        ],
                        ['Add'],
                      ),
                  },
                  h,
                ),
              ],
            ),
          ],
        ),
    }
  }),
)
