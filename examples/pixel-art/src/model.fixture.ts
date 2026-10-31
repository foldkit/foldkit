import { Array, Effect, Layer, Option } from 'effect'
import type { Resolved } from 'foldkit/block'
import { model, story } from 'foldkit/story'

import { Dialog } from '@foldkit/ui'

import { ApplicationLive, type Flags, type Model } from './application'
import { createEmptyGrid } from './domain/grid'
import { ErrorDialogLive } from './errorDialog'
import { GridSizeConfirmDialogLive } from './gridSizeConfirmDialog'
import { ApplicationLayer } from './services'
import {
  GridSizeRadioGroup,
  PaletteRadioGroup,
  ThemeListbox,
  ToolRadioGroup,
  ToolbarLive,
} from './toolbar'

export const application = ApplicationLive.pipe(
  Layer.provide(
    Layer.mergeAll(ToolbarLive, ErrorDialogLive, GridSizeConfirmDialogLive),
  ),
  Layer.provide(
    Layer.mergeAll(
      Dialog.DialogLive,
      ThemeListbox.Live,
      ToolRadioGroup.Live,
      GridSizeRadioGroup.Live,
      PaletteRadioGroup.Live,
    ),
  ),
  Layer.provide(ApplicationLayer),
)

export const startArgs: Readonly<{ flags: Flags }> = {
  flags: {
    maybeSavedCanvas: Option.some({
      grid: createEmptyGrid(4),
      gridSize: 4,
      paletteThemeIndex: 0,
      selectedColorIndex: 0,
    }),
  },
}

export const withInitialModel = <A, E, R>(
  f: (initialModel: Resolved<Model>) => Effect.Effect<A, E, R>,
) =>
  Effect.suspend(() => {
    const initialModels: Array<Resolved<Model>> = []

    return story(
      application,
      startArgs,
      model(initialModel => {
        initialModels.push(initialModel)
      }),
    ).pipe(
      Effect.flatMap(() =>
        Option.match(Array.head(initialModels), {
          onNone: () => Effect.die(new Error('Expected an initial Model')),
          onSome: f,
        }),
      ),
    )
  })
