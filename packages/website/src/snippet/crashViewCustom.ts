import { Runtime } from 'foldkit'
import { Document, html } from 'foldkit/html'

const crashView = ({
  error,
}: Runtime.CrashContext<Model, Message>): Document => {
  const h = html<never>()

  return {
    title: 'Something went wrong',
    body: h.div(
      [h.Class('min-h-screen flex items-center justify-center bg-red-50 p-8')],
      [
        h.div(
          [
            h.Class(
              'max-w-md w-full bg-cream rounded-lg border border-red-200 p-8 text-center',
            ),
          ],
          [
            h.h1(
              [h.Class('text-red-600 text-2xl font-semibold mb-4')],
              ['Something went wrong'],
            ),
            h.p([h.Class('text-gray-700 mb-6')], [error.message]),
            h.button(
              [
                h.Class(
                  'bg-red-600 text-white px-6 py-2.5 rounded-md text-sm font-normal cursor-pointer',
                ),
                h.Attribute('onclick', 'location.reload()'),
              ],
              ['Reload'],
            ),
          ],
        ),
      ],
    ),
  }
}

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  crash: { view: crashView },
  container: document.getElementById('root'),
})

Runtime.run(application)
