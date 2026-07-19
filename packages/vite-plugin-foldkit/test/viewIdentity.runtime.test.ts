// @vitest-environment happy-dom
import { Effect, Fiber, Match as M, Schema as S } from 'effect'
import { brandViewResult } from 'foldkit/brand'
import type { Command } from 'foldkit/command'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { makeElement } from 'foldkit/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { transformViewIdentity } from '../src/viewIdentity.ts'

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
const BRAND_IMPORT_ALIAS = '__foldkitBrandViewResult'
const TYPED_TEXT = 'draft text'

const DELEGATED_BRANCH_FIXTURE = `import { html } from 'foldkit/html'

const h = html()

const summaryView = (model) =>
  h.section([], [h.input([h.Class('summary-input'), h.Placeholder('summary')])])

const editorView = (model) =>
  h.section([], [h.input([h.Class('editor-input'), h.Placeholder('editor')])])

const view = (model) =>
  h.div(
    [],
    [
      model.mode === 'Editing' ? editorView(model) : summaryView(model),
      h.button([h.OnClick(ClickedToggle())], ['toggle']),
    ],
  )
`

const ARM_HANDLER_FIXTURE = `import { html } from 'foldkit/html'

const h = html()

const view = (model) => {
  const handlers = {
    Viewing: () =>
      h.div([], [h.input([h.Class('viewing-input'), h.Placeholder('viewing')])]),
    Editing: () =>
      h.div([], [h.input([h.Class('editing-input'), h.Placeholder('editing')])]),
  }
  return h.div(
    [],
    [handlers[model.mode](), h.button([h.OnClick(ClickedToggle())], ['toggle'])],
  )
}
`

const SHARED_FUNCTION_FIXTURE = `import { html } from 'foldkit/html'

const h = html()

const panelView = (label) =>
  h.div([], [h.input([h.Class('panel-input'), h.Placeholder(label)])])

const view = (model) =>
  h.div(
    [],
    [
      model.mode === 'Editing' ? panelView('editing') : panelView('viewing'),
      h.button([h.OnClick(ClickedToggle())], ['toggle']),
    ],
  )
`

const INLINE_TERNARY_FIXTURE = `import { html } from 'foldkit/html'

const h = html()

const view = (model) =>
  h.div(
    [],
    [
      model.mode === 'Editing'
        ? h.input([h.Class('editing-input'), h.Placeholder('editing')])
        : h.input([h.Class('viewing-input'), h.Placeholder('viewing')]),
      h.button([h.OnClick(ClickedToggle())], ['toggle']),
    ],
  )
`

const stripFoldkitImports = (source: string): string =>
  source
    .split('\n')
    .filter(line => !line.includes("from 'foldkit/"))
    .join('\n')

type View = (model: Model) => Html

const instantiateView = (viewSource: string): View => {
  const factory = new Function(
    'html',
    'ClickedToggle',
    BRAND_IMPORT_ALIAS,
    `${viewSource}\nreturn view`,
  )
  const view: View = factory(html, ClickedToggle, brandViewResult)
  return view
}

const transformFixture = (fixtureSource: string): string => {
  const transformed = transformViewIdentity(
    fixtureSource,
    FIXTURE_MODULE_ID,
    FIXTURE_ROOT,
  )
  if (transformed === null) {
    throw new Error('expected the fixture to transform')
  }
  return transformed.code
}

const instantiateTransformedView = (fixtureSource: string): View =>
  instantiateView(stripFoldkitImports(transformFixture(fixtureSource)))

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

const withRunningApp = async (
  view: View,
  run: () => Promise<void>,
): Promise<void> => {
  const element = makeElement({
    Model,
    init,
    update,
    view,
    container,
  })
  const fiber = Effect.runFork(element.start())
  try {
    await run()
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
}

const runToggleCycle = async (
  viewingClassName: string,
  editingClassName: string,
): Promise<string> => {
  await vi.waitFor(() => requireInput(viewingClassName))
  requireInput(viewingClassName).value = TYPED_TEXT
  clickToggleButton()
  await vi.waitFor(() => requireInput(editingClassName))
  clickToggleButton()
  await vi.waitFor(() => requireInput(viewingClassName))
  return requireInput(viewingClassName).value
}

describe('delegated branch switch', () => {
  it('replaces the subtree when arms delegate to different view functions', async () => {
    const view = instantiateTransformedView(DELEGATED_BRANCH_FIXTURE)
    await withRunningApp(view, async () => {
      const restoredValue = await runToggleCycle(
        'summary-input',
        'editor-input',
      )
      expect(restoredValue).toBe('')
    })
  })

  it('keeps stale branch-local DOM state without the transform, documenting degraded mode', async () => {
    const view = instantiateView(stripFoldkitImports(DELEGATED_BRANCH_FIXTURE))
    await withRunningApp(view, async () => {
      const restoredValue = await runToggleCycle(
        'summary-input',
        'editor-input',
      )
      expect(restoredValue).toBe(TYPED_TEXT)
    })
  })
})

describe('arm-handler identity', () => {
  it('replaces the subtree when arms come from distinct object-literal handlers', async () => {
    const view = instantiateTransformedView(ARM_HANDLER_FIXTURE)
    await withRunningApp(view, async () => {
      const restoredValue = await runToggleCycle(
        'viewing-input',
        'editing-input',
      )
      expect(restoredValue).toBe('')
    })
  })
})

describe('continuity through a shared function', () => {
  it('patches in place when both arms render the same view function', async () => {
    const view = instantiateTransformedView(SHARED_FUNCTION_FIXTURE)
    await withRunningApp(view, async () => {
      await vi.waitFor(() => {
        expect(requireInput('panel-input').placeholder).toBe('viewing')
      })
      requireInput('panel-input').value = TYPED_TEXT
      clickToggleButton()
      await vi.waitFor(() => {
        expect(requireInput('panel-input').placeholder).toBe('editing')
      })
      expect(requireInput('panel-input').value).toBe(TYPED_TEXT)
      clickToggleButton()
      await vi.waitFor(() => {
        expect(requireInput('panel-input').placeholder).toBe('viewing')
      })
      expect(requireInput('panel-input').value).toBe(TYPED_TEXT)
    })
  })
})

describe('react-parity edge', () => {
  it('patches in place across a same-tag ternary inside one function', async () => {
    const view = instantiateTransformedView(INLINE_TERNARY_FIXTURE)
    await withRunningApp(view, async () => {
      const restoredValue = await runToggleCycle(
        'viewing-input',
        'editing-input',
      )
      expect(restoredValue).toBe(TYPED_TEXT)
    })
  })
})
