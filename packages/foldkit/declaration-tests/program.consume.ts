import * as Program from 'foldkit/program'

import {
  CallbackPageProgram,
  ElementProgram,
  Flags,
  PageProgram,
  PendingRawCommandElement,
  ProvidedRawCommandElement,
  PurePageProgram,
  type RawCommandSource,
  RunnableSynchronouslyDecodedElement,
  RunnableSynchronouslyDecodedPage,
  SafeUnionPageProgram,
  SafeUnionRoutedProgram,
} from './program.accepted.js'

const page: Program.Program<undefined, typeof Flags.Type> = PageProgram
const callbackPage: Program.Program<undefined, typeof Flags.Type> =
  CallbackPageProgram
const element: Program.Element = ElementProgram
const purePage: Program.Program = PurePageProgram
const synchronouslyDecodedElement: Program.Element =
  RunnableSynchronouslyDecodedElement
const synchronouslyDecodedPage: Program.Program =
  RunnableSynchronouslyDecodedPage
const safeUnionPage: Program.Program = SafeUnionPageProgram
const safeUnionRouted: Program.Program<undefined, typeof Flags.Type> =
  SafeUnionRoutedProgram
const pendingRawCommand: Program.Pending<
  undefined,
  void,
  RawCommandSource,
  never,
  never,
  'Element'
> = PendingRawCommandElement
const providedRawCommand: Program.Element<
  undefined,
  never,
  never,
  RawCommandSource
> = ProvidedRawCommandElement

void [
  page,
  callbackPage,
  element,
  purePage,
  synchronouslyDecodedElement,
  synchronouslyDecodedPage,
  safeUnionPage,
  safeUnionRouted,
  pendingRawCommand,
  providedRawCommand,
]
