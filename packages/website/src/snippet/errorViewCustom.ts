import { Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'

const errorView = (error: Error): Html => {
  const { div, h1, p, button, Class, Attribute } = html<never>()

  return div(
    [
      Class(
        'min-h-screen flex items-center justify-center bg-red-50 p-8',
      ),
    ],
    [
      div(
        [
          Class(
            'max-w-md w-full bg-cream rounded-lg border border-red-200 p-8 text-center',
          ),
        ],
        [
          h1(
            [Class('text-red-600 text-2xl font-semibold mb-4')],
            ['Something went wrong'],
          ),
          p([Class('text-gray-700 mb-6')], [error.message]),
          button(
            [
              Class(
                'bg-red-600 text-white px-6 py-2.5 rounded-md text-sm font-normal cursor-pointer',
              ),
              Attribute('onclick', 'location.reload()'),
            ],
            ['Reload'],
          ),
        ],
      ),
    ],
  )
}

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  errorView,
  container: document.getElementById('root')!,
})

Runtime.run(element)
