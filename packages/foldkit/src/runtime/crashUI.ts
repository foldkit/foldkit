import { Effect } from 'effect'

import { Document, html } from '../html/index.js'

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
  context: Readonly<{ error: Error }>,
  viewError?: unknown,
): Document => {
  const h = html()

  const codeBlockStyle = h.Style({
    fontFamily: monoStack,
    color: colors.textPrimary,
    margin: '0',
    fontSize: '0.9375rem',
    lineHeight: '1.5',
    backgroundColor: colors.codeBg,
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
  })

  const labelStyle = h.Style({
    color: colors.textSecondary,
    margin: '0 0 0.5rem 0',
    fontSize: '0.875rem',
    fontWeight: '500',
  })

  const inlineCodeStyle = h.Style({
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
        h.span([inlineCodeStyle], ['crash.view']),
        ' threw an error while rendering.',
      ]
    : [
        'Foldkit encountered an unrecoverable error while running your application.',
      ]

  const errorContent = viewError
    ? [
        h.div(
          [h.Style({ margin: '0 0 1rem 0' })],
          [
            h.p([labelStyle], ['Original error']),
            h.p([codeBlockStyle], [context.error.message]),
          ],
        ),
        h.div(
          [h.Style({ margin: '0 0 1.25rem 0' })],
          [
            h.p([labelStyle], ['crash.view error']),
            h.p([codeBlockStyle], [viewErrorMessage]),
          ],
        ),
      ]
    : [
        h.p(
          [
            h.Style({
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
        h.p(
          [
            h.Style({
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
            h.span([inlineCodeStyle], ['crash.view']),
            ' function to ',
            h.span([inlineCodeStyle], ['makeProgram']),
            '.',
          ],
        ),
      ]

  const body = h.div(
    [
      h.Style({
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
      h.div(
        [
          h.Style({
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
          h.h1(
            [
              h.Style({
                color: colors.errorAccent,
                margin: '0 0 0.75rem 0',
                fontSize: '1.25rem',
                fontWeight: '600',
                lineHeight: '1.5',
              }),
            ],
            ['Application Crash'],
          ),
          h.p(
            [
              h.Style({
                color: colors.textPrimary,
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                lineHeight: '1.625',
              }),
            ],
            introText,
          ),
          ...errorContent,
          h.p(
            [
              h.Style({
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
          h.button(
            [
              h.Style({
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
              h.Attribute('onclick', 'location.reload()'),
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
