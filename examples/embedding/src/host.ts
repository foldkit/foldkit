import { Function, Option } from 'effect'
import { Runtime } from 'foldkit'

import { makeElement } from './main'

const INITIAL_COUNT = 10

const getElement = (elementId: string): HTMLElement => {
  const element = document.getElementById(elementId)
  if (element === null) {
    throw new Error(`Missing host element "${elementId}"`)
  }
  return element
}

const getInputElement = (elementId: string): HTMLInputElement => {
  const element = document.getElementById(elementId)
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing host input "${elementId}"`)
  }
  return element
}

export const startHost = (): void => {
  getElement('root').outerHTML = `
    <div class="mx-auto flex min-h-screen max-w-2xl flex-col gap-7 p-6 sm:p-10">
      <header class="flex flex-col gap-1">
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Host application</h1>
        <p class="text-sm text-gray-600">
          This page is plain TypeScript with no Foldkit runtime of its own. It
          embeds the widget below with <code>Runtime.embed</code> and talks to it
          only through the handle: Flags at mount, <code>send</code> in,
          <code>subscribe</code> out, <code>dispose</code> on unmount.
        </p>
      </header>

      <section class="flex flex-col gap-4 rounded-3xl border border-gray-200/80 bg-white p-6 shadow-lg">
        <h2 class="text-sm font-semibold text-gray-900">Host controls</h2>
        <div class="flex flex-wrap items-center gap-4">
          <button
            id="mount-toggle"
            class="cursor-pointer rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-700"
          ></button>
          <label class="flex items-center gap-2 text-sm text-gray-700">
            Step
            <input id="step-range" type="range" min="1" max="10" value="1" />
            <span id="step-value" class="w-4 font-semibold tabular-nums">1</span>
          </label>
        </div>
        <p class="text-sm text-gray-700">
          Last count received from the widget:
          <span id="host-count" class="font-semibold tabular-nums">none yet</span>
        </p>
      </section>

      <div id="widget-slot"></div>
    </div>
  `

  const mountToggleButton = getElement('mount-toggle')
  const stepRange = getInputElement('step-range')
  const stepValueDisplay = getElement('step-value')
  const hostCountDisplay = getElement('host-count')
  const widgetSlot = getElement('widget-slot')

  const element = makeElement(widgetSlot, { initialCount: INITIAL_COUNT })

  type WidgetHandle = Runtime.EmbedHandle<typeof element.ports>

  let maybeHandle: Option.Option<WidgetHandle> = Option.none()

  const mountWidget = (): void => {
    const handle = Runtime.embed(element)

    handle.ports.countChanged.subscribe(count => {
      hostCountDisplay.textContent = String(count)
    })
    handle.ports.stepChanged.send(Number(stepRange.value))

    maybeHandle = Option.some(handle)
    mountToggleButton.textContent = 'Unmount widget'
  }

  const unmountWidget = (handle: WidgetHandle): void => {
    handle.dispose()
    maybeHandle = Option.none()
    mountToggleButton.textContent = 'Mount widget'
  }

  mountToggleButton.addEventListener('click', () => {
    Option.match(maybeHandle, {
      onNone: mountWidget,
      onSome: unmountWidget,
    })
  })

  stepRange.addEventListener('input', () => {
    stepValueDisplay.textContent = stepRange.value
    Option.match(maybeHandle, {
      onNone: Function.constVoid,
      onSome: handle => {
        handle.ports.stepChanged.send(Number(stepRange.value))
      },
    })
  })

  mountWidget()
}
