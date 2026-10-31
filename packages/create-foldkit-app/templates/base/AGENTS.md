# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Every feature with state is a Block class, `class Search extends Block<Search, Args>()('Search', { Model, Message, OutMessage, Command, Mount }) {}`, implemented by `SearchLive = Search.make(Effect.fn(function* (id, args) { ... }))`. One file, one Block: each Block's Messages, Model, Commands, class, and `Live` Layer live together in a file named for it, such as `application.ts` for the root and `search.ts` for `Search`. When a Block grows too large to read, extract a feature into a child Block in its own file; never split a Block across `model.ts`, `message.ts`, `command.ts`, `update.ts`, or `view.ts`. `entry.ts` creates the Program with `Program.make(Application, { layer, container, ... })`, providing every child Block's Layer and the root `ApplicationLayer` of ordinary Services, and starts the Runtime. Name the root Route union `ApplicationRoute` and the root Service provider `ApplicationLayer` (`ApplicationTestLayer` for its test alternative).

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: false

## Project Notes

Domain vocabulary, deployment steps, local conventions that differ from Foldkit's defaults: write them here.
