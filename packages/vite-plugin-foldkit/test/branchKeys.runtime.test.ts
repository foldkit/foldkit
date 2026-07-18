// @vitest-environment happy-dom
import { Effect, Fiber, Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit/command'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { makeElement } from 'foldkit/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { transformBranchKeys } from '../src/branchKeys.ts'

const Model = S.Struct({ mode: S.Literals(['Viewing', 'Editing']) })
type Model = typeof Model.Type

const ClickedToggle = m('ClickedToggle')
type Message = typeof ClickedToggle.Type

const init = (): readonly [Model, ReadonlyArray<Command<Message>>] => [
  { mode: 'Viewing' },
  [],
]

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedToggle: () => {
        const nextMode = model.mode === 'Viewing' ? 'Editing' : 'Viewing'
        return [{ mode: nextMode }, []]
      },
    }),
  )

const FIXTURE_MODULE_ID = '/app/src/View.js'
const FIXTURE_ROOT = '/app'

const FIXTURE_VIEW_SOURCE = `import { html } from 'foldkit/html'

const h = html()

const view = (model) =>
  h.div(
    [],
    [
      model.mode === 'Editing'
        ? h.input([h.Class('editing'), h.Placeholder('editing')])
        : h.input([h.Class('viewing'), h.Placeholder('viewing')]),
      h.button([h.OnClick(ClickedToggle())], ['toggle']),
    ],
  )
`

const stripHtmlImport = (source: string): string =>
  source
    .split('\n')
    .filter(line => !line.includes('foldkit/html'))
    .join('\n')

type View = (model: Model) => Html

const instantiateView = (viewSource: string): View => {
  const factory = new Function(
    'html',
    'ClickedToggle',
    `${viewSource}\nreturn view`,
  )
  const view: View = factory(html, ClickedToggle)
  return view
}

const TYPED_TEXT = 'draft text'

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const requireInput = (className: string): HTMLInputElement => {
  const input = document.querySelector(`input.${className}`)
  if (input instanceof HTMLInputElement) {
    return input
  }
  throw new Error(`input.${className} not found`)
}

const clickToggleButton = (): void => {
  const button = document.querySelector('button')
  if (button === null) {
    throw new Error('toggle button not found')
  }
  button.click()
}

const runToggleScenario = async (view: View): Promise<string> => {
  const element = makeElement({
    Model,
    init,
    update,
    view,
    container,
  })
  const fiber = Effect.runFork(element.start())
  try {
    await vi.waitFor(() => requireInput('viewing'))
    requireInput('viewing').value = TYPED_TEXT
    clickToggleButton()
    await vi.waitFor(() => requireInput('editing'))
    clickToggleButton()
    await vi.waitFor(() => requireInput('viewing'))
    return requireInput('viewing').value
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
}

describe('branch keys at runtime', () => {
  it('drops branch-local DOM state when switching branches in transformed code', async () => {
    const transformed = transformBranchKeys(
      FIXTURE_VIEW_SOURCE,
      FIXTURE_MODULE_ID,
      FIXTURE_ROOT,
    )
    expect(transformed).not.toBeNull()
    if (transformed === null) {
      return
    }

    const view = instantiateView(stripHtmlImport(transformed.code))
    const restoredValue = await runToggleScenario(view)

    expect(restoredValue).toBe('')
  })

  it('keeps stale branch-local DOM state without the transform, documenting degraded mode', async () => {
    const view = instantiateView(stripHtmlImport(FIXTURE_VIEW_SOURCE))
    const restoredValue = await runToggleScenario(view)

    expect(restoredValue).toBe(TYPED_TEXT)
  })
})
