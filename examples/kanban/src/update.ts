import { Array, Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { Column } from './domain'

export const update = ApplicationComposition.makeUpdate({
  ClickedAddCard: (model, { columnId }) => ({
    model: modifyFields(model, {
      maybeNewCardColumnId: () => Option.some(columnId),
      newCardTitle: () => '',
    }),
    commands: [FocusAddCardInput()],
  }),

  ChangedNewCardTitle: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ newCardTitle: () => value }),
  ),

  SubmittedNewCard: model =>
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

  CompletedGenerateCardId: (model, { cardId, columnId, title }) => {
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

  CancelledNewCard: ApplicationDefinition.makeFieldsStep(() => ({
    maybeNewCardColumnId: () => Option.none(),
    newCardTitle: () => '',
  })),

  CompletedSaveBoard: ApplicationDefinition.makeNoopStep(),

  CompletedFocusAddCardInput: ApplicationDefinition.makeNoopStep(),
})
