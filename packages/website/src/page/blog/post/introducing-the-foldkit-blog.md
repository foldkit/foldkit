---
title: Introducing the Foldkit Blog
description: A new home for release notes, patterns, and deep dives into building frontend applications with Foldkit.
date: 2026-08-01
---

Foldkit now has a blog. This is where we will write about the framework in longer form than a changelog entry allows: what shipped, why it works the way it does, and the patterns we keep reaching for when building real applications.

## What to expect

A few kinds of posts will show up here.

**Release notes with context.** The changelog records what changed. Posts here will explain why, what problem a feature solves, and how it fits the architecture.

**Patterns.** The Elm Architecture answers most questions about where code should live, but some designs deserve a walkthrough: modeling async workflows, composing Submodels, organizing Subscriptions, and the like. The [docs](/core/architecture) cover the primitives; posts here will cover putting them together.

**Deep dives.** How the runtime schedules renders, how the route parser round-trips URLs, how the website you are reading pre-renders itself with its own runtime. The internals are ordinary Effect-TS code, and walking through them is a good way to learn both.

## How this page is built

This blog is a folder of markdown files. Each post carries a small frontmatter block that the `@foldkit/markdown` Vite plugin validates against an Effect Schema at build time, so a missing title or a malformed date fails the build instead of shipping. The markdown compiles to a typed document module, and the same rendering pipeline that powers the docs renders the prose you are reading.

If that sounds like your kind of thing, you will probably enjoy the rest of the site. Start with the [manifesto](/get-started/manifesto), or subscribe to the [newsletter](/newsletter) to hear about new posts.
