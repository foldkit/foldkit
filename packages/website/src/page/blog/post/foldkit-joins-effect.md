---
title: Foldkit Joins Effect
description: Foldkit is becoming part of Effect and will become its full-stack application framework.
date: 2026-11-19
coverImage: /blog/foldkit-joins-effect/cover.jpg
coverImageAlt: Black caps embroidered with Foldkit and Effect.orDie sit side by side on a colorful keyboard.
coverImageWidth: 3600
coverImageHeight: 2400
---

Hello friends,

I have some super exciting and probably not-all-that-surprising news to share!

I'm joining Effectful Technologies full time as a core maintainer of Effect, and I'm bringing Foldkit with me. Foldkit will live under the Effect organization.

I started Foldkit in June 2025 to explore what an Effect-native frontend framework could look like. Since then, Foldkit has found production users, grown a community of developers, and reached 1,200+ GitHub stars and around 180k weekly npm downloads.

It's a great start. Now, we're putting the full power of the Effect team behind the project and setting our sights on something much bigger.

Foldkit will move beyond frontend to become Effect's full-stack application framework: a composable, opinionated, agent-friendly stack from browser to database, built directly on Effect primitives.

A few more things I'm particularly excited about:

**On the frontend**, we're rebuilding Foldkit's foundation from the ground up, and I couldn't be happier about how it's going. We're building composable, Elm-inspired primitives directly into Effect so you can build UIs across different rendering environments. We're taking what we've learned building Foldkit and using it to create something better suited to production applications at scale.

**Beyond the frontend**, we're bringing that same opinionated, Effect-native approach to data access, auth, email, background work, sync and local-first, and deployment. The pieces will be composable and testable, with observability built in.

The goal is to make building a whole product with Effect feel as cohesive and powerful as writing a single Effect program.

Personally, I'm thrilled to work as part of the Effect team. It's been a dream of mine.

## Q&A

### What happens to the current Foldkit frontend framework?

Feature development will pause as we shift that work to the new frontend foundation. We'll keep fixing critical bugs at least until it ships with an upgrade guide.

### Should I keep building with Foldkit or start a new project with it?

Yes. If you build a Foldkit app today, we'll give you an upgrade path to the new frontend foundation.

### What is the new frontend foundation?

The new frontend foundation will be part of Effect itself and the basis for Foldkit's full-stack framework. It will provide composable, host-agnostic, Elm-inspired primitives for building user interfaces with Effect. It keeps what people like about Foldkit today while addressing the rough edges.

### Will existing applications need to be migrated or rewritten?

Migrated, yes. Rewritten, no. Moving to the new frontend foundation should feel like a major Foldkit upgrade, not like adopting a new framework. There will be API changes, some of them substantial, and we'll publish upgrade guides as they take shape.

### What happens to the Blocks and Layers preview release?

The Blocks and Layers preview won't ship. That work will be absorbed into the new frontend foundation.

---

Thank you to everyone who's used Foldkit, contributed, shared feedback, or helped spread the word. You've helped shape what Foldkit is today, and I'm incredibly excited about what we'll build next.

We're just getting started.
