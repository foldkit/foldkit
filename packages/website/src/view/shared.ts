import { clsx } from 'clsx'
import { Array, Match as M } from 'effect'
import { Html } from 'foldkit/html'

import {
  AriaLabel,
  AriaLive,
  Class,
  Disabled,
  Href,
  Id,
  OnInput,
  OnSubmit,
  Placeholder,
  Type,
  Value,
  a,
  button,
  div,
  empty,
  form,
  h2,
  input,
  p,
  span,
} from '../html'
import { type EmailSubscriptionStatus, type StringField } from '../main'
import { SubmittedEmailForm, UpdatedEmailField } from '../message'

export const betaTag: Html = span(
  [
    Class(
      'inline-block -rotate-6 rounded bg-accent-700 dark:bg-accent-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wider text-white dark:text-accent-900 select-none',
    ),
    AriaLabel('Beta'),
  ],
  ['Beta'],
)

export const iconLink = (link: string, ariaLabel: string, icon: Html) =>
  a(
    [
      Href(link),
      Class(
        'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition',
      ),
      AriaLabel(ariaLabel),
    ],
    [icon],
  )

export const skipNavLink: Html = a(
  [
    Href('#main-content'),
    Class(
      'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-600 dark:focus:bg-accent-500 focus:text-white focus:text-sm focus:font-normal',
    ),
  ],
  ['Skip to main content'],
)

export const emailFormView = (
  emailField: StringField,
  status: 'Idle' | 'Submitting' | 'Failed',
  formClassName: string,
): Html => {
  const isSubmitting = status === 'Submitting'

  return div(
    [],
    [
      form(
        [OnSubmit(SubmittedEmailForm()), Class(formClassName)],
        [
          div(
            [Class('flex-1')],
            [
              input([
                Type('email'),
                AriaLabel('Email address'),
                Placeholder('you@example.com'),
                Value(emailField.value),
                OnInput(value => UpdatedEmailField({ value })),
                Disabled(isSubmitting),
                Class(
                  clsx(
                    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 disabled:opacity-60',
                    emailField._tag === 'Invalid'
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-gray-300 dark:border-gray-800',
                  ),
                ),
              ]),
              emailField._tag === 'Invalid'
                ? p(
                    [
                      AriaLive('polite'),
                      Class('mt-1.5 text-sm text-red-600 dark:text-red-400'),
                    ],
                    [Array.headNonEmpty(emailField.errors)],
                  )
                : empty,
            ],
          ),
          button(
            [
              Type('submit'),
              Disabled(isSubmitting),
              Class(
                'px-6 py-2.5 rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 font-normal transition hover:bg-accent-700 dark:hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
              ),
            ],
            [isSubmitting ? 'Subscribing...' : 'Subscribe'],
          ),
        ],
      ),
      status === 'Failed'
        ? p(
            [
              AriaLive('polite'),
              Class('mt-3 text-sm text-red-600 dark:text-red-400'),
            ],
            ['Something went wrong. Please try again.'],
          )
        : empty,
    ],
  )
}

export const emailSignupContentView = (
  emailField: StringField,
  emailSubscriptionStatus: EmailSubscriptionStatus,
): Html =>
  div(
    [Id('newsletter')],
    [
      h2(
        [
          Class(
            'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4 text-balance',
          ),
        ],
        ['Stay in the update loop.'],
      ),
      p(
        [Class('text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl')],
        ['New releases, patterns, and the occasional deep dive.'],
      ),
      M.value(emailSubscriptionStatus).pipe(
        M.withReturnType<Html>(),
        M.when('Succeeded', () =>
          p(
            [
              AriaLive('polite'),
              Class('text-accent-600 dark:text-accent-400 font-normal'),
            ],
            ['You\u2019re in! Check your email for confirmation.'],
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
