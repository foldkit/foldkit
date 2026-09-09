import { Context, Effect, Option } from 'effect'

import {
  Document,
  Html,
  type HtmlBuilder,
  __clearRuntime as clearHtmlRuntime,
  __htmlBuilder as htmlBuilderFor,
  inertHtml as ih,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import { MountTracker } from '../mount/index.js'
import { VNode, __patchVNode } from '../vdom.js'
import { Dispatch } from './dispatch.js'
import { applyDocumentMetadata } from './documentMetadata.js'

/** Context provided to crash.view and crash.report when the runtime encounters
 *  an unrecoverable error. `message` is the Message being processed when the
 *  crash occurred, present as an `Option` because a crash during the initial
 *  render has no triggering Message. */
export type CrashContext<Model, Message> = Readonly<{
  error: Error
  model: Model
  message: Option.Option<Message>
}>

/** Configuration for crash handling, with custom crash UI and/or crash
 *  reporting. The crash view renders after the dispatch loop has stopped, so
 *  its builder's Message is `never` and no handler is expressible. Reload or
 *  navigate with a raw DOM attribute instead. */
export type CrashConfig<Model, Message> = Readonly<{
  view?: (
    context: CrashContext<Model, Message>,
    h: HtmlBuilder<never>,
  ) => Document
  report?: (context: CrashContext<Model, Message>) => void
}>

/** Configuration for crash handling in a `makeElement` app. The crash view
 *  returns `Html`, not a `Document`, because a scoped app never owns the
 *  document `<head>`. */
export type ElementCrashConfig<Model, Message> = Readonly<{
  view?: (context: CrashContext<Model, Message>, h: HtmlBuilder<never>) => Html
  report?: (context: CrashContext<Model, Message>) => void
}>

export const noOpDispatch = {
  dispatchAsync: (_message: unknown) => Effect.void,
  dispatchSync: (_message: unknown) => {},
}

const colors = {
  bg: '#f9fafb',
  cardBg: '#ffffff',
  border: '#e5e7eb',
  errorAccent: '#dc2626',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  codeBg: '#f3f4f6',
  buttonBg: '#18181b',
  buttonText: '#ffffff',
}

const fontStack =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const monoStack =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

export const defaultCrashView = (
  context: CrashContext<unknown, unknown>,
  viewError?: unknown,
): Document => {
  const codeBlockStyle = ih.Style({
    fontFamily: monoStack,
    color: colors.textPrimary,
    margin: '0',
    fontSize: '0.9375rem',
    lineHeight: '1.5',
    backgroundColor: colors.codeBg,
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
  })

  const labelStyle = ih.Style({
    color: colors.textSecondary,
    margin: '0 0 0.5rem 0',
    fontSize: '0.875rem',
    fontWeight: '500',
  })

  const inlineCodeStyle = ih.Style({
    fontFamily: monoStack,
    backgroundColor: colors.codeBg,
    padding: '0.125rem 0.375rem',
    borderRadius: '0.25rem',
  })

  const viewErrorMessage =
    viewError instanceof Error ? viewError.message : String(viewError)

  const introText = viewError
    ? [
        'Your custom ',
        ih.span([inlineCodeStyle], ['crash.view']),
        ' threw an error while rendering.',
      ]
    : [
        'Foldkit encountered an unrecoverable error while running your application.',
      ]

  const errorContent = viewError
    ? [
        ih.div(
          [ih.Style({ margin: '0 0 1rem 0' })],
          [
            ih.p([labelStyle], ['Original error']),
            ih.p([codeBlockStyle], [context.error.message]),
          ],
        ),
        ih.div(
          [ih.Style({ margin: '0 0 1.25rem 0' })],
          [
            ih.p([labelStyle], ['crash.view error']),
            ih.p([codeBlockStyle], [viewErrorMessage]),
          ],
        ),
      ]
    : [
        ih.p(
          [
            ih.Style({
              fontFamily: monoStack,
              color: colors.textPrimary,
              margin: '0 0 1.25rem 0',
              fontSize: '0.9375rem',
              lineHeight: '1.5',
              backgroundColor: colors.codeBg,
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
            }),
          ],
          [context.error.message],
        ),
      ]

  const footerText = viewError
    ? []
    : [
        ih.p(
          [
            ih.Style({
              color: colors.textSecondary,
              margin: '1.5rem 0 0 0',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '1rem',
            }),
          ],
          [
            'This is the default crash view. You can customize it by providing a ',
            ih.span([inlineCodeStyle], ['crash.view']),
            ' function.',
          ],
        ),
      ]

  const body = ih.div(
    [
      ih.Style({
        fontFamily: fontStack,
        padding: '2rem',
        minHeight: '100vh',
        backgroundColor: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }),
    ],
    [
      ih.div(
        [
          ih.Style({
            width: '100%',
            maxWidth: '960px',
            margin: '0 auto',
            backgroundColor: colors.cardBg,
            borderRadius: '0 0.5rem 0.5rem 0',
            border: `1px solid ${colors.border}`,
            borderLeft: `4px solid ${colors.errorAccent}`,
            padding: '1.5rem',
          }),
        ],
        [
          ih.h1(
            [
              ih.Style({
                color: colors.errorAccent,
                margin: '0 0 0.75rem 0',
                fontSize: '1.25rem',
                fontWeight: '600',
                lineHeight: '1.5',
              }),
            ],
            ['Application Crash'],
          ),
          ih.p(
            [
              ih.Style({
                color: colors.textPrimary,
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                lineHeight: '1.625',
              }),
            ],
            introText,
          ),
          ...errorContent,
          ih.p(
            [
              ih.Style({
                color: colors.textPrimary,
                margin: '0 0 1.5rem 0',
                fontSize: '1rem',
                lineHeight: '1.5',
              }),
            ],
            [
              '→ Check the browser console for the full stack trace with source-mapped line numbers.',
            ],
          ),
          ih.button(
            [
              ih.Style({
                fontFamily: fontStack,
                backgroundColor: colors.buttonBg,
                color: colors.buttonText,
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
              }),
              ih.Attribute('onclick', 'location.reload()'),
            ],
            ['Reload'],
          ),
          ...footerText,
        ],
      ),
    ],
  )

  return { title: 'Application Crash', body }
}

/** Mutable holder for the vnode tree currently mounted in the container.
 *  The render frame writes it after every patch; the dispose finalizer, the
 *  replay render, and {@link renderCrashView} read it. A plain object rather
 *  than a Ref because every reader runs synchronously on the main thread. */
export type VNodeSlot = {
  maybeCurrentVNode: Option.Option<VNode>
}

export const renderCrashView = <Model, Message>(
  context: CrashContext<Model, Message>,
  crash: CrashConfig<Model, Message> | undefined,
  container: HTMLElement,
  vnodeSlot: VNodeSlot,
  manageDocument: boolean,
): void => {
  console.error('[foldkit] Application crash:', context.error)

  if (crash?.report) {
    try {
      crash.report(context)
    } catch (reportError) {
      console.error('[foldkit] crash.report failed:', reportError)
    }
  }

  const crashContext = Context.make(Dispatch, noOpDispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  try {
    setHtmlRuntime(noOpDispatch.dispatchSync, crashContext)
    let crashDocument: Document
    try {
      crashDocument = crash?.view
        ? crash.view(context, htmlBuilderFor<never>())
        : defaultCrashView(context)
    } finally {
      clearHtmlRuntime()
    }

    const patchedVNode = __patchVNode(
      vnodeSlot.maybeCurrentVNode,
      crashDocument.body,
      container,
    )
    vnodeSlot.maybeCurrentVNode = Option.some(patchedVNode)
    if (manageDocument) {
      applyDocumentMetadata(crashDocument, patchedVNode.elm)
    }
  } catch (viewError) {
    console.error('[foldkit] crash.view failed:', viewError)

    const fallbackViewError =
      viewError instanceof Error ? viewError : new Error(String(viewError))

    setHtmlRuntime(noOpDispatch.dispatchSync, crashContext)
    let fallbackDocument: Document
    try {
      fallbackDocument = defaultCrashView(context, fallbackViewError)
    } finally {
      clearHtmlRuntime()
    }

    const patchedVNode = __patchVNode(
      vnodeSlot.maybeCurrentVNode,
      fallbackDocument.body,
      container,
    )
    vnodeSlot.maybeCurrentVNode = Option.some(patchedVNode)
    if (manageDocument) {
      applyDocumentMetadata(fallbackDocument, patchedVNode.elm)
    }
  }
}
