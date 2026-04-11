import { Match as M, Option } from 'effect'
import { Html } from 'foldkit/html'

import {
  Alt,
  Autocomplete,
  Class,
  Disabled,
  Href,
  OnClick,
  OnInput,
  OnSubmit,
  Placeholder,
  Src,
  Type,
  Value,
  a,
  button,
  div,
  form,
  h1,
  h2,
  h3,
  img,
  input,
  label,
  li,
  p,
  section,
  span,
  ul,
} from '../../../html'
import { GotNowAdminMessage } from '../../../message'
import {
  ClickedDeletePasskey,
  ClickedLoginWithPasskey,
  ClickedLogout,
  ClickedRegisterPasskey,
  ClickedResetBannerDraft,
  ClickedSaveBanner,
  type Message,
  SubmittedPassphraseForm,
  UpdatedBannerAvatarUrlField,
  UpdatedBannerMessageField,
  UpdatedBannerProfileHandleField,
  UpdatedBannerProfileUrlField,
  UpdatedPasskeyLabelField,
  UpdatedPassphraseField,
} from './message'
import { type Locked, type LoggingIn, type Model, type Unlocked } from './model'

const toParent = (message: Message) => GotNowAdminMessage({ message })

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500'

const buttonPrimaryClass =
  'inline-flex items-center justify-center rounded-md bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 px-4 py-2 text-sm font-normal transition hover:bg-accent-700 dark:hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed'

const buttonSecondaryClass =
  'inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-cream dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2 text-sm font-normal transition hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'

const buttonDangerClass =
  'inline-flex items-center justify-center rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-3 py-1.5 text-xs font-normal transition hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-50'

const labelClass =
  'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wider'

const cardClass =
  'rounded-lg border border-gray-200 dark:border-gray-800 bg-cream dark:bg-gray-900 p-6'

// LOADING

const viewLoading = (): Html =>
  div([Class('text-sm text-gray-500 dark:text-gray-400')], ['Loading admin…'])

// LOCKED / LOGGING IN (shared UI for passphrase form + passkey button)

const viewLoginForm = (model: Locked | LoggingIn): Html => {
  const isLoggingIn = model._tag === 'LoggingIn'
  const loginError =
    model._tag === 'Locked'
      ? Option.getOrElse(model.maybeLoginError, () => '')
      : ''

  return div(
    [Class(cardClass + ' max-w-md w-full')],
    [
      h1(
        [Class('text-2xl font-normal text-gray-900 dark:text-white mb-2')],
        ['Now admin'],
      ),
      p(
        [Class('text-sm text-gray-600 dark:text-gray-300 mb-6')],
        ['Sign in to update the status banner.'],
      ),

      ...(model.canUsePasskey
        ? [
            div(
              [Class('mb-4')],
              [
                button(
                  [
                    Class(buttonPrimaryClass + ' w-full'),
                    Disabled(isLoggingIn),
                    OnClick(toParent(ClickedLoginWithPasskey())),
                  ],
                  [
                    isLoggingIn && model.method === 'Passkey'
                      ? 'Waiting for passkey…'
                      : 'Sign in with passkey',
                  ],
                ),
              ],
            ),
            div(
              [
                Class(
                  'relative flex items-center my-4 text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500',
                ),
              ],
              [
                div([Class('flex-1 h-px bg-gray-300 dark:bg-gray-700')], []),
                span([Class('px-3')], ['or']),
                div([Class('flex-1 h-px bg-gray-300 dark:bg-gray-700')], []),
              ],
            ),
          ]
        : []),

      ...(model.canUsePassphrase
        ? [
            form(
              [
                Class('flex flex-col gap-3'),
                OnSubmit(toParent(SubmittedPassphraseForm())),
              ],
              [
                div(
                  [],
                  [
                    label([Class(labelClass)], ['Recovery passphrase']),
                    input([
                      Class(inputClass),
                      Type('password'),
                      Autocomplete('current-password'),
                      Placeholder('your passphrase'),
                      Value(model.passphraseValue),
                      Disabled(isLoggingIn),
                      OnInput(value =>
                        toParent(UpdatedPassphraseField({ value })),
                      ),
                    ]),
                  ],
                ),
                button(
                  [
                    Class(buttonPrimaryClass),
                    Disabled(isLoggingIn || model.passphraseValue.length === 0),
                  ],
                  [
                    isLoggingIn && model.method === 'Passphrase'
                      ? 'Verifying…'
                      : 'Sign in with passphrase',
                  ],
                ),
              ],
            ),
          ]
        : []),

      ...(loginError !== ''
        ? [
            p(
              [Class('mt-4 text-sm text-red-600 dark:text-red-400')],
              [loginError],
            ),
          ]
        : []),
    ],
  )
}

// UNLOCKED: banner form

const viewBannerSection = (model: Unlocked): Html => {
  const banner = model.bannerDraft
  const saveState = model.saveState

  const hasChanges =
    banner.message !== model.savedBanner.message ||
    banner.avatarUrl !== model.savedBanner.avatarUrl ||
    banner.profileHandle !== model.savedBanner.profileHandle ||
    banner.profileUrl !== model.savedBanner.profileUrl

  return section(
    [Class(cardClass + ' max-w-2xl w-full')],
    [
      h2(
        [Class('text-xl font-normal text-gray-900 dark:text-white mb-4')],
        ['Status banner'],
      ),
      div(
        [Class('flex flex-col gap-4')],
        [
          div(
            [],
            [
              label([Class(labelClass)], ['Message']),
              input([
                Class(inputClass),
                Type('text'),
                Value(banner.message),
                OnInput(value =>
                  toParent(UpdatedBannerMessageField({ value })),
                ),
              ]),
            ],
          ),
          div(
            [],
            [
              label([Class(labelClass)], ['Avatar URL']),
              input([
                Class(inputClass),
                Type('url'),
                Value(banner.avatarUrl),
                OnInput(value =>
                  toParent(UpdatedBannerAvatarUrlField({ value })),
                ),
              ]),
            ],
          ),
          div(
            [Class('grid grid-cols-1 md:grid-cols-2 gap-4')],
            [
              div(
                [],
                [
                  label([Class(labelClass)], ['Profile handle']),
                  input([
                    Class(inputClass),
                    Type('text'),
                    Value(banner.profileHandle),
                    OnInput(value =>
                      toParent(UpdatedBannerProfileHandleField({ value })),
                    ),
                  ]),
                ],
              ),
              div(
                [],
                [
                  label([Class(labelClass)], ['Profile URL']),
                  input([
                    Class(inputClass),
                    Type('url'),
                    Value(banner.profileUrl),
                    OnInput(value =>
                      toParent(UpdatedBannerProfileUrlField({ value })),
                    ),
                  ]),
                ],
              ),
            ],
          ),

          div(
            [
              Class(
                'flex flex-col gap-3 mt-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4',
              ),
            ],
            [
              span(
                [Class('text-xs uppercase tracking-wider text-gray-500')],
                ['Preview'],
              ),
              div(
                [Class('flex items-center gap-3')],
                [
                  img([
                    Src(banner.avatarUrl),
                    Alt(banner.profileHandle),
                    Class(
                      'h-8 w-8 rounded-full border border-gray-200 dark:border-gray-800',
                    ),
                  ]),
                  span(
                    [
                      Class(
                        'text-sm text-gray-700 dark:text-gray-200 leading-snug',
                      ),
                    ],
                    [banner.message],
                  ),
                ],
              ),
            ],
          ),

          div(
            [Class('flex items-center gap-3 mt-2')],
            [
              button(
                [
                  Class(buttonPrimaryClass),
                  Disabled(saveState._tag === 'Saving' || !hasChanges),
                  OnClick(toParent(ClickedSaveBanner())),
                ],
                [
                  saveState._tag === 'Saving'
                    ? 'Saving…'
                    : 'Save and broadcast',
                ],
              ),
              button(
                [
                  Class(buttonSecondaryClass),
                  Disabled(!hasChanges || saveState._tag === 'Saving'),
                  OnClick(toParent(ClickedResetBannerDraft())),
                ],
                ['Discard changes'],
              ),
              M.value(saveState).pipe(
                M.tag('SaveIdle', (): Html => span([], [''])),
                M.tag(
                  'Saving',
                  (): Html =>
                    span(
                      [Class('text-sm text-gray-500 dark:text-gray-400')],
                      [''],
                    ),
                ),
                M.tag(
                  'SavedAt',
                  (): Html =>
                    span(
                      [Class('text-sm text-accent-700 dark:text-accent-400')],
                      ['Saved.'],
                    ),
                ),
                M.tag(
                  'SaveFailed',
                  ({ reason }): Html =>
                    span(
                      [Class('text-sm text-red-600 dark:text-red-400')],
                      [`Save failed: ${reason}`],
                    ),
                ),
                M.exhaustive,
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

// UNLOCKED: passkeys section

const viewPasskeysSection = (model: Unlocked): Html => {
  const passkeysSection = model.passkeysSection

  return section(
    [Class(cardClass + ' max-w-2xl w-full mt-6')],
    [
      h2(
        [Class('text-xl font-normal text-gray-900 dark:text-white mb-4')],
        ['Passkeys'],
      ),
      M.value(passkeysSection).pipe(
        M.tag(
          'LoadingPasskeys',
          (): Html =>
            p(
              [Class('text-sm text-gray-500 dark:text-gray-400')],
              ['Loading passkeys…'],
            ),
        ),
        M.tag(
          'FailedLoadPasskeys',
          ({ reason }): Html =>
            p(
              [Class('text-sm text-red-600 dark:text-red-400')],
              [`Failed to load: ${reason}`],
            ),
        ),
        M.tag('LoadedPasskeys', ({ passkeys, registerState }): Html => {
          const labelDraft =
            registerState._tag === 'RegisterIdle'
              ? registerState.labelDraft
              : registerState._tag === 'RegisterFailed'
                ? registerState.labelDraft
                : ''
          const isRegistering = registerState._tag === 'Registering'
          const registerError =
            registerState._tag === 'RegisterFailed' ? registerState.reason : ''

          return div(
            [Class('flex flex-col gap-4')],
            [
              passkeys.length === 0
                ? p(
                    [Class('text-sm text-gray-500 dark:text-gray-400')],
                    [
                      'No passkeys registered. Register one now — it is much safer than the recovery passphrase.',
                    ],
                  )
                : ul(
                    [Class('flex flex-col gap-2')],
                    passkeys.map(
                      (passkey): Html =>
                        li(
                          [
                            Class(
                              'flex items-center justify-between rounded border border-gray-200 dark:border-gray-800 px-3 py-2',
                            ),
                          ],
                          [
                            div(
                              [Class('flex flex-col')],
                              [
                                span(
                                  [
                                    Class(
                                      'text-sm text-gray-900 dark:text-white',
                                    ),
                                  ],
                                  [passkey.label],
                                ),
                                span(
                                  [
                                    Class(
                                      'text-xs text-gray-500 dark:text-gray-400 font-mono',
                                    ),
                                  ],
                                  [
                                    `${passkey.credentialId.slice(
                                      0,
                                      12,
                                    )}… · registered ${new Date(
                                      passkey.registeredAt,
                                    ).toLocaleDateString()}`,
                                  ],
                                ),
                              ],
                            ),
                            button(
                              [
                                Class(buttonDangerClass),
                                OnClick(
                                  toParent(
                                    ClickedDeletePasskey({
                                      credentialId: passkey.credentialId,
                                    }),
                                  ),
                                ),
                              ],
                              ['Delete'],
                            ),
                          ],
                        ),
                    ),
                  ),

              div(
                [Class('border-t border-gray-200 dark:border-gray-800 pt-4')],
                [
                  h3(
                    [
                      Class(
                        'text-sm font-medium text-gray-700 dark:text-gray-200 mb-3',
                      ),
                    ],
                    ['Register a new passkey'],
                  ),
                  div(
                    [Class('flex items-end gap-3')],
                    [
                      div(
                        [Class('flex-1')],
                        [
                          label([Class(labelClass)], ['Label']),
                          input([
                            Class(inputClass),
                            Type('text'),
                            Placeholder('e.g. "iPhone 15" or "YubiKey A"'),
                            Value(labelDraft),
                            Disabled(isRegistering),
                            OnInput(value =>
                              toParent(UpdatedPasskeyLabelField({ value })),
                            ),
                          ]),
                        ],
                      ),
                      button(
                        [
                          Class(buttonPrimaryClass),
                          Disabled(
                            isRegistering || labelDraft.trim().length === 0,
                          ),
                          OnClick(toParent(ClickedRegisterPasskey())),
                        ],
                        [isRegistering ? 'Registering…' : 'Register'],
                      ),
                    ],
                  ),
                  ...(registerError !== ''
                    ? [
                        p(
                          [
                            Class(
                              'mt-2 text-sm text-red-600 dark:text-red-400',
                            ),
                          ],
                          [`Failed: ${registerError}`],
                        ),
                      ]
                    : []),
                ],
              ),
            ],
          )
        }),
        M.exhaustive,
      ),
    ],
  )
}

// PUBLIC

export const view = (model: Model): Html =>
  div(
    [
      Class(
        'min-h-screen flex flex-col items-center justify-start gap-6 px-4 py-10 md:py-16 bg-cream dark:bg-gray-950',
      ),
    ],
    [
      M.value(model).pipe(
        M.tag('Loading', (): Html => viewLoading()),
        M.tag('Locked', (locked): Html => viewLoginForm(locked)),
        M.tag('LoggingIn', (loggingIn): Html => viewLoginForm(loggingIn)),
        M.tag(
          'Unlocked',
          (unlocked): Html =>
            div(
              [Class('w-full max-w-2xl flex flex-col')],
              [
                div(
                  [Class('flex items-center justify-between mb-6')],
                  [
                    h1(
                      [
                        Class(
                          'text-3xl font-normal text-gray-900 dark:text-white',
                        ),
                      ],
                      ['Now admin'],
                    ),
                    button(
                      [
                        Class(buttonSecondaryClass),
                        OnClick(toParent(ClickedLogout())),
                      ],
                      ['Sign out'],
                    ),
                  ],
                ),
                viewBannerSection(unlocked),
                viewPasskeysSection(unlocked),
              ],
            ),
        ),
        M.exhaustive,
      ),
      div(
        [Class('mt-8 text-xs text-gray-400 dark:text-gray-600')],
        [a([Href('/'), Class('hover:underline')], ['← Back to foldkit.dev'])],
      ),
    ],
  )

// Re-export message for convenience
export type { Message }
