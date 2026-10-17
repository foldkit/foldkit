import { AsyncData } from 'foldkit'
import { Html } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
} from './composition'
import { Message } from './message'
import type { WeatherData } from './model'

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Weather',
  body: h.div(
    [
      h.Class(
        'min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      h.h1([h.Class('text-4xl font-bold text-blue-900 mb-8')], ['Weather']),

      h.form(
        [
          h.Class('flex flex-col gap-4 items-center w-full max-w-md'),
          h.OnSubmit(Message.SubmittedWeatherForm()),
        ],
        [
          Input.view(
            {
              id: 'location',
              value: model.zipCodeInput,
              placeholder: 'Enter a zip code',
              onInput: value => Message.UpdatedZipCodeInput({ value }),
              toView: attributes =>
                h.input([
                  ...attributes.input,
                  h.Autocomplete('off'),
                  h.DataAttribute('1p-ignore', ''),
                  h.AriaLabel('Zip code'),
                  h.Class(
                    'w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 outline-none',
                  ),
                ]),
            },
            h,
          ),
          Button.view(
            {
              type: 'submit',
              isDisabled: AsyncData.isPending(model.weather),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition data-[disabled]:opacity-50',
                    ),
                  ],
                  [
                    AsyncData.isPending(model.weather)
                      ? 'Loading...'
                      : 'Get Weather',
                  ],
                ),
            },
            h,
          ),
        ],
      ),

      AsyncData.matchDataSplitEmpty(model.weather, {
        onIdle: () => h.empty,
        onLoading: () =>
          h.div(
            [h.Class('text-blue-600 font-semibold text-center')],
            ['Fetching Application...'],
          ),
        onFailure: error =>
          h.div(
            [
              h.Class(
                'p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg',
              ),
            ],
            [error],
          ),
        onData: weather =>
          h.div([h.Class('w-full max-w-md')], [weatherView(weather, h)]),
      }),
    ],
  ),
}))

const weatherView = (weather: WeatherData, h: ApplicationViewBuilder): Html =>
  h.article(
    [h.Class('bg-white rounded-xl shadow-lg p-8 w-full')],
    [
      h.h2(
        [h.Class('text-2xl font-bold text-gray-800 mb-3 text-center')],
        [weather.zipCode],
      ),
      h.p(
        [h.Class('text-center text-gray-600 mb-6')],
        [weather.locationName + ', ' + weather.region],
      ),

      h.div(
        [h.Class('text-center mb-6')],
        [
          h.div(
            [h.Class('text-6xl font-bold text-blue-600')],
            [`${weather.temperature}°F`],
          ),
          h.div([h.Class('text-xl text-gray-600 mt-2')], [weather.description]),
        ],
      ),

      h.div(
        [h.Class('grid grid-cols-2 gap-4 text-center')],
        [
          h.div(
            [h.Class('bg-blue-50 p-4 rounded-lg')],
            [
              h.div([h.Class('text-sm text-gray-600')], ['Humidity']),
              h.div(
                [h.Class('text-lg font-semibold')],
                [`${weather.humidity}%`],
              ),
            ],
          ),
          h.div(
            [h.Class('bg-blue-50 p-4 rounded-lg')],
            [
              h.div([h.Class('text-sm text-gray-600')], ['Wind Speed']),
              h.div(
                [h.Class('text-lg font-semibold')],
                [`${weather.windSpeed} mph`],
              ),
            ],
          ),
        ],
      ),
    ],
  )
