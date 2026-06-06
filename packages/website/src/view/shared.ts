import { clsx } from 'clsx'
import { Array, Match as M } from 'effect'
import type { Field } from 'foldkit/fieldValidation'
import { Html, html } from 'foldkit/html'

import { formatStarCount } from '../githubStars'
import { Icon } from '../icon'
import { type EmailSubscriptionStatus } from '../main'
import { type Message, SubmittedEmailForm, UpdatedEmailField } from '../message'

export const betaTag: Html = (() => {
  const h = html<Message>()

  return h.span(
    [
      h.Class(
        'hidden sm:inline-block -rotate-6 rounded bg-accent-700 dark:bg-accent-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wider text-white dark:text-accent-900 select-none',
      ),
      h.AriaLabel('Beta'),
    ],
    ['Beta'],
  )
})()

export const iconLink = (link: string, ariaLabel: string, icon: Html) => {
  const h = html<Message>()

  return h.a(
    [
      h.Href(link),
      h.Class(
        'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition',
      ),
      h.AriaLabel(ariaLabel),
    ],
    [icon],
  )
}

export const githubStarBadge = (count: number): Html => {
  const h = html<Message>()

  return h.span(
    [
      h.Class(
        'inline-flex items-center gap-1 rounded-full bg-gray-900 dark:bg-white px-2 pt-0.5 pb-0.75 text-xs font-semibold text-white dark:text-gray-900',
      ),
      h.AriaHidden(true),
    ],
    [
      Icon.star('w-3.5 h-3.5'),
      h.span([h.Class('mt-px')], [formatStarCount(count)]),
    ],
  )
}

export const skipNavLink: Html = (() => {
  const h = html<Message>()

  return h.a(
    [
      h.Href('#main-content'),
      h.Class(
        'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-600 dark:focus:bg-accent-500 focus:text-white focus:text-sm focus:font-normal',
      ),
    ],
    ['Skip to main content'],
  )
})()

export const emailFormView = (
  emailField: Field<string>,
  status: 'Idle' | 'Submitting' | 'Failed',
  formClassName: string,
): Html => {
  const h = html<Message>()

  const isSubmitting = status === 'Submitting'

  return h.div(
    [],
    [
      h.form(
        [h.OnSubmit(SubmittedEmailForm()), h.Class(formClassName)],
        [
          h.div(
            [h.Class('flex-1')],
            [
              h.input([
                h.Type('email'),
                h.AriaLabel('Email address'),
                h.Placeholder('you@example.com'),
                h.Value(emailField.value),
                h.OnInput(value => UpdatedEmailField({ value })),
                h.Disabled(isSubmitting),
                h.Class(
                  clsx(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 disabled:opacity-60',
                    emailField._tag === 'Invalid'
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-gray-300 dark:border-gray-800',
                  ),
                ),
              ]),
              emailField._tag === 'Invalid'
                ? h.p(
                    [
                      h.AriaLive('polite'),
                      h.Class('mt-1.5 text-sm text-red-600 dark:text-red-400'),
                    ],
                    [Array.headNonEmpty(emailField.errors)],
                  )
                : h.empty,
            ],
          ),
          h.button(
            [
              h.Type('submit'),
              h.Disabled(isSubmitting),
              h.Class(
                'px-6 py-2.5 rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 font-normal transition hover:bg-accent-700 dark:hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
              ),
            ],
            [isSubmitting ? 'Subscribing...' : 'Subscribe'],
          ),
        ],
      ),
      status === 'Failed'
        ? h.p(
            [
              h.AriaLive('polite'),
              h.Class('mt-3 text-sm text-red-600 dark:text-red-400'),
            ],
            ['Something went wrong. Please try again.'],
          )
        : h.empty,
    ],
  )
}

export const emailSignupContentView = (
  emailField: Field<string>,
  emailSubscriptionStatus: EmailSubscriptionStatus,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Id('newsletter')],
    [
      h.h2(
        [
          h.Class(
            'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4 text-balance',
          ),
        ],
        ['Stay in the update loop.'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl')],
        ['New releases, patterns, and the occasional deep dive.'],
      ),
      M.value(emailSubscriptionStatus).pipe(
        M.withReturnType<Html>(),
        M.when('Succeeded', () =>
          h.p(
            [
              h.AriaLive('polite'),
              h.Class('text-accent-600 dark:text-accent-400 font-normal'),
            ],
            ['You’re in! Check your email for confirmation.'],
          ),
        ),
        M.orElse(status =>
          emailFormView(
            emailField,
            status,
            'flex flex-col sm:flex-row gap-3 max-w-md',
          ),
        ),
      ),
    ],
  )
}
