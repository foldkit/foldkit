---
'create-foldkit-app': patch
---

Update the View section of the scaffolded `AGENTS.md` template to teach the new dotted-html convention: bind `const h = html<Message>()` per module (or `html<ParentMessage>()` inside a generic child view) and reach for elements, attributes, and event handlers via `h.div`, `h.OnClick`, etc. The previous template instructed users to call `html<Message>()` once in a dedicated `html.ts` file and re-export the destructured helpers, which contradicts the convention used in every Foldkit example.
