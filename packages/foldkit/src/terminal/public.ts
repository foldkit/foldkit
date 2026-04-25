export { terminal } from './view'

export type {
  Attribute,
  BorderStyle,
  Color,
  FlexDirection,
  TerminalNode,
  TerminalView,
} from './view'

export { makeTerminalProgram, runTerminal } from './runtime'

export type {
  MakeTerminalRuntimeReturn,
  TerminalCrashConfig,
  TerminalProgramConfig,
  TerminalProgramConfigWithFlags,
  TerminalProgramInit,
} from './runtime'

export { keyPressStream } from './input'

export type { KeyPress } from './input'
