import { Predicate } from 'effect'
import type { Socket } from 'effect/socket'

export class ControlledSocket implements Socket.WebSocketLike {
  readyState = 0
  closeCount = 0
  readonly sent: Array<string> = []
  readonly listeners = new Map<
    string,
    Set<(event: Socket.WebSocketEvent) => void>
  >()

  addEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: Socket.WebSocketEvent) => void,
  ): void {
    const listeners = this.listeners.get(type) ?? new Set()

    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: Socket.WebSocketEvent) => void,
  ): void {
    this.listeners.get(type)?.delete(listener)
  }

  open(): void {
    this.readyState = 1
    this.emit('open', {})
  }

  receive(text: string): void {
    this.emit('message', { data: text })
  }

  send(data: string | Uint8Array<ArrayBuffer>): void {
    if (Predicate.isString(data)) {
      this.sent.push(data)
    }
  }

  close(): void {
    this.closeCount += 1
    this.readyState = 3
    this.emit('close', {})
  }

  listenerCount(): number {
    return globalThis.Array.from(this.listeners.values()).reduce(
      (count, listeners) => count + listeners.size,
      0,
    )
  }

  private emit(type: string, event: Socket.WebSocketEvent): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}
