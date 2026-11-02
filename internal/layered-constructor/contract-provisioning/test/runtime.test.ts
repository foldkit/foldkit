import { Array, Effect, Layer, Option } from 'effect'
import { Socket } from 'effect/socket'
import { Program, Runtime } from 'foldkit'
import { expect, test, vi } from 'vitest'

import { RoomStartup } from '../src/chatRoom/roomStartup'
import { ChatRoomWithComposerBlock } from '../src/provided'
import { RoomCollectionBlock } from '../src/roomCollection'
import { ControlledSocket } from './controlledSocket'

const button = (container: HTMLElement, name: string) =>
  Option.getOrThrow(
    Array.findFirst(
      Array.fromIterable(container.querySelectorAll('button')),
      button => button.textContent === name,
    ),
  )

test('Program executes the private Focus Mount, socket handlers, stream, and resource cleanup through supplied Layers', async () => {
  const sockets: Array<ControlledSocket> = []
  const ServicesLayer = Layer.succeed(Socket.WebSocketConstructor, () => {
    const socket = new ControlledSocket()

    sockets.push(socket)

    return socket
  })
  const container = document.createElement('div')
  container.id = 'contract-provisioning-runtime'
  const wrapper = document.createElement('div')
  wrapper.appendChild(container)
  document.body.appendChild(wrapper)

  const program = Program.makeElement({
    block: ChatRoomWithComposerBlock,
    container,
    Flags: RoomStartup,
    flags: Effect.succeed(
      RoomStartup.make({ title: 'General', inputId: 'general-message-input' }),
    ),
  }).provide(ServicesLayer)
  const handle = Runtime.embed(program)

  try {
    await vi.waitFor(() => {
      expect(wrapper.textContent).toContain('General')
    })

    button(wrapper, 'Connect').click()

    await vi.waitFor(() => {
      expect(sockets).toHaveLength(1)
    })

    const socket = Option.getOrThrow(Array.head(sockets))
    socket.open()

    await vi.waitFor(() => {
      expect(socket.listeners.get('message')?.size).toBe(1)
      expect(document.activeElement?.id).toBe('general-message-input')
    })

    const input = wrapper.querySelector('input')

    if (input === null) {
      throw new Error('The connected message input is missing.')
    }

    input.value = 'Hello'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await vi.waitFor(() => {
      expect(button(wrapper, 'Send').disabled).toBe(false)
    })

    button(wrapper, 'Send').click()

    await vi.waitFor(() => {
      expect(socket.sent).toEqual(['Hello'])
      expect(input.value).toBe('')
      expect(wrapper.textContent).toContain('Hello')
    })

    socket.receive('Echo')

    await vi.waitFor(() => {
      expect(wrapper.textContent).toContain('Echo')
    })

    button(wrapper, 'Disconnect').click()

    await vi.waitFor(() => {
      expect(socket.closeCount).toBe(1)
      expect(socket.listenerCount()).toBe(0)
      expect(wrapper.querySelector('input')).toBeNull()
    })
  } finally {
    handle.dispose()
  }

  await vi.waitFor(() => {
    expect(wrapper.textContent).toBe('')
    expect(wrapper.firstElementChild).toBe(container)
  })
  wrapper.remove()
})

test('two direct Rooms and a keyed Room keep independent resources through the public Program', async () => {
  const sockets: Array<ControlledSocket> = []
  const ServicesLayer = Layer.succeed(Socket.WebSocketConstructor, () => {
    const socket = new ControlledSocket()

    sockets.push(socket)

    return socket
  })
  const container = document.createElement('div')
  container.id = 'contract-room-collection-runtime'
  const wrapper = document.createElement('div')
  wrapper.appendChild(container)
  document.body.appendChild(wrapper)

  const room = (title: string) => {
    const element = wrapper.querySelector<HTMLElement>(
      `section[aria-label="${title}"]`,
    )

    if (element === null) {
      throw new Error(`Room ${title} is missing.`)
    }

    return element
  }
  const connect = async (title: string) => {
    const socketCount = sockets.length
    button(room(title), 'Connect').click()

    await vi.waitFor(() => expect(sockets).toHaveLength(socketCount + 1))
    const socket = Option.getOrThrow(Array.last(sockets))
    socket.open()

    await vi.waitFor(() =>
      expect(room(title).querySelector('input')).not.toBeNull(),
    )

    return socket
  }
  const send = async (
    title: string,
    text: string,
    socket: ControlledSocket,
  ) => {
    const input = room(title).querySelector('input')

    if (input === null) {
      throw new Error(`Room ${title} has no connected Message Composer.`)
    }

    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.waitFor(() =>
      expect(button(room(title), 'Send').disabled).toBe(false),
    )
    button(room(title), 'Send').click()

    await vi.waitFor(() => expect(socket.sent).toEqual([text]))
  }
  const program = Program.makeElement({
    block: RoomCollectionBlock,
    container,
  }).provide(ServicesLayer)
  const handle = Runtime.embed(program)

  try {
    await vi.waitFor(() =>
      expect(
        wrapper.querySelector('section[aria-label="Support"]'),
      ).not.toBeNull(),
    )

    const general = await connect('General')
    const random = await connect('Random')
    const support = await connect('Support')

    await send('General', 'General message', general)
    await send('Random', 'Random message', random)
    await send('Support', 'Support message', support)

    general.receive('General reply')
    random.receive('Random reply')
    support.receive('Support reply')

    await vi.waitFor(() => {
      expect(room('General').textContent).toContain('General reply')
      expect(room('Random').textContent).toContain('Random reply')
      expect(room('Support').textContent).toContain('Support reply')
    })

    button(wrapper, 'Remove Support').click()

    await vi.waitFor(() => {
      expect(support.closeCount).toBe(1)
      expect(support.listenerCount()).toBe(0)
      expect(wrapper.querySelector('section[aria-label="Support"]')).toBeNull()
    })
    expect(general.closeCount).toBe(0)
    expect(random.closeCount).toBe(0)

    button(wrapper, 'Add Support').click()

    await vi.waitFor(() =>
      expect(
        wrapper.querySelector('section[aria-label="Support"]'),
      ).not.toBeNull(),
    )
    const reopenedSupport = await connect('Support')
    await send('Support', 'New support message', reopenedSupport)

    expect(support.sent).toEqual(['Support message'])
    expect(general.sent).toEqual(['General message'])
    expect(random.sent).toEqual(['Random message'])
  } finally {
    handle.dispose()
  }

  await vi.waitFor(() => {
    expect(sockets).toHaveLength(4)

    for (const socket of sockets) {
      expect(socket.closeCount).toBe(1)
      expect(socket.listenerCount()).toBe(0)
    }
  })
  wrapper.remove()
})
