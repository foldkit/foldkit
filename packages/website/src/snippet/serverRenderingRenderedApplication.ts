type RenderedApplication = Readonly<{
  html: string
  title: string
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  canonical?: string
  ogUrl?: string
}>
