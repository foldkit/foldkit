import { Array, Option } from 'effect'

import {
  ApplicationComposition,
  EditorsBinding,
  FocusedBinding,
  MaybeEditorBinding,
  PrimaryBinding,
  RowsBinding,
  SecondaryBinding,
} from './composition.js'

export const view = ApplicationComposition.makeView((model, h) =>
  h.main(
    [],
    [
      h.block(
        PrimaryBinding.embedView({
          slotId: 'primary',
          model: model.primary,
          viewInputs: { label: 'Primary' },
        }),
      ),
      h.block(
        SecondaryBinding.embedView({
          slotId: 'secondary',
          model: model.secondary,
          viewInputs: { label: 'Secondary' },
        }),
      ),
      h.block(
        FocusedBinding.embedView({
          slotId: 'focused',
          model: model.focused,
          viewInputs: { label: 'Focused' },
        }),
      ),
      Option.match(model.maybeEditor, {
        onNone: () => h.empty,
        onSome: editor =>
          h.block(
            MaybeEditorBinding.embedView({
              slotId: 'optional',
              model: editor,
              viewInputs: { label: 'Optional' },
            }),
          ),
      }),
      ...Object.entries(model.editors).map(([key, editor]) =>
        h.block(
          EditorsBinding.embedView({
            key,
            slotId: `saved-${key}`,
            model: editor,
            viewInputs: { label: key },
          }),
        ),
      ),
      ...Array.map(model.rows, row =>
        h.block(
          RowsBinding.embedView({
            key: row.key,
            slotId: row.key,
            model: row.model,
            viewInputs: { label: row.key },
          }),
        ),
      ),
    ],
  ),
)
