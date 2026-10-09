# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Start small: `main.ts` may hold the program definitions while `entry.ts` assembles, provides, and runs the application. Use separate `application.ts` and `layer.ts` roots when several features make the split useful. In that layout, `application.ts` lifts runtime registrations and exposes application assembly, `layer.ts` composes `AppLayer` and any alternate `AppTestLayer`, and `entry.ts` starts the Runtime. Use a `makeApplication(container)` factory whenever tests or server tooling import the registration module, or when the entry chooses the DOM container. A static `application` export is acceptable only when every importer is browser-side and runs after the intended container exists.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: false

## Project Notes

Domain vocabulary, deployment steps, local conventions that differ from Foldkit's defaults: write them here.
