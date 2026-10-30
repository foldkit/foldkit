import { Program as RootProgram } from 'foldkit'
import { make as makeProgram } from 'foldkit/program'
import * as ProgramModule from 'foldkit/program'

import { Application, ApplicationLive } from './application'

const container = document.getElementById('root')

RootProgram.make(Application, { layer: ApplicationLive, container })
makeProgram(Application, {
  layer: ApplicationLive,
  container,
  slow: { thresholdOverrides: { View: 32 } },
})
ProgramModule.makeElement(Application, {
  layer: ApplicationLive,
  container,
  slow: true,
})

export const makeLocal = (Program: {
  make: (block: unknown, options: unknown) => unknown
}) => Program.make(Application, { slow: false })
