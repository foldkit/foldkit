---
'foldkit': minor
---

Add a `preserveScroll` option to `makeApplication` that retains the window scroll position across Vite dev reloads. Every edit triggers a full page reload, which resets scroll to the top; Foldkit now captures `window.scrollX`/`scrollY` just before the reload and reapplies it once the restored view has rendered, so editing a page you have scrolled deep into no longer bounces you back to the top on every save.

Defaults to `true` and, like `freezeModel`, activates only when running under Vite's dev server, so production builds pay nothing. It applies to document-owning apps built with `makeApplication`; embedded `makeElement` apps never touch the host page's scroll. Pass `preserveScroll: false` to opt out. Only the window scroll offset is preserved; nested `overflow` container positions are not. The offset is reapplied as soon as the restored view renders, so a page whose full height settles only after asynchronous layout, such as images without set dimensions or media that loads in below the fold, can land short of a deep offset.
