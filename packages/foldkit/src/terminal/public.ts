export type { KeyPress } from './input.js'
export { keyPressStream } from './input.js'

export type {
  TerminalProgram,
  TerminalProgramConfig,
  TerminalProgramConfigWithFlags,
  TerminalView,
} from './runtime.js'
export { makeTerminalProgram, runTerminal } from './runtime.js'
