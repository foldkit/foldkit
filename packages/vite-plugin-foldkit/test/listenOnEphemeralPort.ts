import { Array } from 'effect'

const EPHEMERAL_PORT_ATTEMPTS = 3

// NOTE: Vite probes and releases an ephemeral port before binding its HTTP
// server. A competing listener can claim it between those two operations.
export const listenOnEphemeralPort = async (
  listen: () => Promise<unknown>,
): Promise<void> => {
  for (const attempt of Array.range(1, EPHEMERAL_PORT_ATTEMPTS)) {
    try {
      await listen()
      return
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !/^Port \d+ is already in use$/.test(error.message) ||
        attempt === EPHEMERAL_PORT_ATTEMPTS
      ) {
        throw error
      }
    }
  }
}
