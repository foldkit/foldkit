import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import { Application, ApplicationLive, Flags, flags } from './application'
import { ErrorDialogLive } from './errorDialog'
import { GridSizeConfirmDialogLive } from './gridSizeConfirmDialog'
import { HeaderLive } from './header'
import { HistoryPanelLive } from './historyPanel'
import { ApplicationLayer } from './services'
import {
  GridSizeRadioGroup,
  PaletteRadioGroup,
  ThemeListbox,
  ToolRadioGroup,
  ToolbarLive,
} from './toolbar'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        HeaderLive,
        ToolbarLive,
        HistoryPanelLive,
        ErrorDialogLive,
        GridSizeConfirmDialogLive,
      ),
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
  ),
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })
