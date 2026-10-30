import type { Document, HtmlBuilder, TextDirection } from 'foldkit/html'

type ApplicationViewBuilder = HtmlBuilder<Message>

// TRANSLATION

const translate = (locale: Locale, key: string): string => {
  // Your catalog lookup. Foldkit does not ship translation.
  return catalog[locale][key] ?? key
}

const languageTag: Readonly<Record<Locale, string>> = {
  English: 'en',
  Arabic: 'ar',
  Japanese: 'ja',
}

const textDirection: Readonly<Record<Locale, TextDirection>> = {
  English: 'Ltr',
  Arabic: 'Rtl',
  Japanese: 'Ltr',
}

export const view = (model: Model, h: ApplicationViewBuilder): Document => ({
  title: translate(model.locale, 'PageTitle'),
  lang: languageTag[model.locale],
  dir: textDirection[model.locale],
  body: h.div(
    [h.Class('mx-auto max-w-prose p-6')],
    [
      h.h1([], [translate(model.locale, 'PageTitle')]),
      localePicker(model.locale, h),
    ],
  ),
})
