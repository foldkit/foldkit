import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

const BUTTONDOWN_SUBSCRIBE_URL =
  'https://buttondown.com/api/emails/embed-subscribe/foldkit'

// NOTE: Buttondown's embed endpoint only accepts native form submissions. A
// fetch request cannot hand the subscriber over when Buttondown needs them to
// solve a CAPTCHA or fix a rejected address, so this form posts straight to
// Buttondown and the browser follows the response into a new tab.
export const formView = <Message>(
  email: string,
  toMessage: (value: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  ih.form(
    [
      ih.Action(BUTTONDOWN_SUBSCRIBE_URL),
      ih.Method('post'),
      ih.Target('popupwindow'),
      ih.Class('flex flex-col sm:flex-row gap-3 max-w-md'),
    ],
    [
      ih.div(
        [ih.Class('flex-1')],
        [
          h.input([
            h.Type('email'),
            h.Name('email'),
            h.Required(true),
            h.AriaLabel('Email address'),
            h.Placeholder('you@example.com'),
            h.Value(email),
            h.OnInput(toMessage),
            h.Class(
              'w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400',
            ),
          ]),
        ],
      ),
      ih.button(
        [
          ih.Type('submit'),
          ih.Class('button-accent px-6 py-2.5 rounded-lg cursor-pointer'),
        ],
        ['Subscribe'],
      ),
    ],
  )

export const content = <Message>(
  email: string,
  toMessage: (value: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  ih.div(
    [ih.Id('newsletter')],
    [
      ih.h2(
        [
          ih.Class(
            'font-sans font-medium text-3xl md:text-4xl text-gray-900 dark:text-white mb-4 text-balance',
          ),
        ],
        ['Stay in the update loop.'],
      ),
      ih.p(
        [
          ih.Class(
            'text-base md:text-lg font-book text-gray-700 dark:text-gray-400 mb-8 max-w-xl',
          ),
        ],
        ['New releases, patterns, and the occasional deep dive.'],
      ),
      formView(email, toMessage, h),
    ],
  )
