// src/application.ts

import { Effect, Option } from 'effect'
import { Block } from 'foldkit'

// Flags, Model, Message, SaveCanvas, ExportPng, and view are declared above

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model,
  Message,
  Command: [SaveCanvas, ExportPng],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    return {
      model: {
        grid: Option.match(flags.maybeSavedCanvas, {
          onNone: () => createEmptyGrid(DEFAULT_GRID_SIZE),
          onSome: savedCanvas => savedCanvas.grid,
        }),
        undoStack: [],
        redoStack: [],
        tool: 'Brush',
        mirrorMode: 'None',
        isDrawing: false,
        maybeHoveredCell: Option.none(),
        // remaining fields elided for brevity
      },
      update: {
        // one handler per Message
      },
      commands: {
        // one handler per Command
      },
      view,
    }
  }),
)

// src/entry.ts

import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import { Application, ApplicationLive, Flags, flags } from './application'
import { ApplicationLayer } from './services'
import {
  GridSizeRadioGroup,
  PaletteRadioGroup,
  ThemeListbox,
  ToolRadioGroup,
} from './toolbar'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
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
})

Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })
