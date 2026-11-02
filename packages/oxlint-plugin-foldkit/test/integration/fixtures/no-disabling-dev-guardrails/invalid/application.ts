import { Program as RootProgram } from 'foldkit'
import {
  make as makeProgram,
  makeElement as makeProgramElement,
} from 'foldkit/program'
import * as ProgramModule from 'foldkit/program'

import { Application, ApplicationLive } from './application'

const container = document.getElementById('root')

RootProgram.make(Application, {
  layer: ApplicationLive,
  container,
  slow: false,
})
makeProgram(Application, { layer: ApplicationLive, container, slow: false })
makeProgramElement(Application, {
  layer: ApplicationLive,
  container,
  slow: false,
})
ProgramModule.makeElement(Application, {
  layer: ApplicationLive,
  container,
  slow: false,
})
