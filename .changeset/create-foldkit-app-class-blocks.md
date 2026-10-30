---
'create-foldkit-app': minor
---

Scaffold class Blocks. New projects declare `Application` as a class Block, implement it with `ApplicationLive`, start it with `Program.make(Application, { layer, ... })`, and test it with `story` and `scene` on its Layer. The bundled FOLDKIT.md and app skills teach the class Block conventions.

Scaffolded projects follow one file, one Block: each Block's Messages, Model, Commands, class, and `Live` Layer live in a file named for it, and a Block that grows too large extracts a child Block instead of splitting into `message.ts`, `model.ts`, `update.ts`, `command.ts`, or `view.ts`. The SSG template declares its routes in `application.ts`, and the SSR template keeps its cookie reader there, so neither scaffolds a module outside that layout.
