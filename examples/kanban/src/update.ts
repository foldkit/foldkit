import { Array, Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import { ApplicationComposition } from './composition'
import { Column } from './domain'
import { Message } from './message'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedAddCard: ({ columnId }) => ({
      model: modifyFields(model, {
        maybeNewCardColumnId: () => Option.some(columnId),
        newCardTitle: () => '',
      }),
      commands: [FocusAddCardInput()],
    }),

    ChangedNewCardTitle: ({ value }) => ({
      model: modifyFields(model, { newCardTitle: () => value }),
    }),

    SubmittedNewCard: () =>
      Option.match(model.maybeNewCardColumnId, {
        onNone: () => ({ model }),
        onSome: columnId => {
          const title = String.trim(model.newCardTitle)
          if (String.isEmpty(title)) {
            return { model }
          }

          return {
            model,
            commands: [GenerateCardId({ columnId, title })],
          }
        },
      }),

    CompletedGenerateCardId: ({ cardId, columnId, title }) => {
      const nextColumns = Array.map(model.columns, column => {
        if (column.id !== columnId) {
          return column
        }
        return Column.appendCard(column, {
          id: cardId,
          title,
          description: '',
          sortKey: '',
        })
      })

      return {
        model: modifyFields(model, {
          columns: () => nextColumns,
          maybeNewCardColumnId: () => Option.none(),
          newCardTitle: () => '',
        }),
        commands: [SaveBoard({ columns: nextColumns })],
      }
    },

    CancelledNewCard: () => ({
      model: modifyFields(model, {
        maybeNewCardColumnId: () => Option.none(),
        newCardTitle: () => '',
      }),
    }),

    CompletedSaveBoard: () => ({ model }),

    CompletedFocusAddCardInput: () => ({ model }),
  }),
)
