---
name: write-release-blog-post
description: Outline, draft, or revise a Foldkit version release blog post using the repository's announcement style and editorial preferences. Use for release announcements, not general guides or changelog entries.
---

# Write a Foldkit release blog post

Use this skill for the editorial shape of a version announcement. The repository's
prose, snippet, historical-post, and contributor-attribution rules live in
`AGENTS.md` and `.agents/writing-prose.md`.

## Choose the amount of detail

Foldkit's version posts give selected changes room to explain themselves. They
usually open with the version and a short summary, group the highlights under
feature headings, and close with release notes and contributor thanks. A release
with one substantial addition can revolve around that addition. Do not give every
package or changeset a section just to complete the inventory.

Read [the post examples](references/posts.md) to choose a relevant model. The
0.167.0 post is the clearest example of the current balance. Earlier posts offer
useful shapes for a focused addition, several smaller features, and combined
releases. Their older API examples describe those releases, not today's API.

Allocate detail according to what helps the reader understand the change:

- **A new API:** Explain the operation it replaces or simplifies, then show a
  compact, realistic snippet when the call shape is the useful part. A changeset
  example can supply the starting point. The `foldChildAt` section in 0.167.0 shows
  the parent selecting an Applicant Submodel by key without teaching the whole
  Submodel architecture.
- **Interactive behavior:** Reuse an existing guide demo when trying it conveys
  more than additional prose. Introduce the visible behavior and give readers
  concrete actions to try. The VirtualList section in 0.167.0 needs only two
  short paragraphs before its chat demo; row measurement and lifecycle wiring
  belong in the linked guide. This is an example of appropriate depth, not a
  paragraph limit or a requirement to add a demo to every post.
- **Moves and renames:** Make the reorganization the news. Show both prior and new
  names, with a small table when several mappings deserve highlighting. Explain
  any behavioral change separately. A move into a new module does not make the
  existing helpers new functionality. Avoid following a rename table with a
  compressed tutorial on wiring the renamed APIs.
- **Smaller changes:** Include a short “More in this release” list when the items
  warrant a mention. The release-notes link can carry the rest. Do not expand
  minor fixes into feature paragraphs to account for every change.

## Keep the announcement distinct from the guides

Link a feature's guide or complete example beside that feature. Include enough
code or explanation for the reader to see why the change is useful, then let the
linked material teach configuration and integration.

Put upgrade instructions, complete package versions, and the full change list in
the release notes. Do not add an “Upgrading” section by default, even though older
posts have one. An old/new mapping can belong in the announcement when the rename
itself is a highlight; a complete migration recipe belongs in the release notes.

The usual closing points to the relevant version's release notes, followed by
“Thanks to everyone building with Foldkit!” and “Devin”. When covering several
releases, state that scope near the opening and link each release's notes.

Place verified contributor thanks beside the relevant feature or near the closing
for smaller contributions. Follow the repository's attribution pass over the full
release range, including work omitted from the highlights.

A casual personal line can fit the voice. Past jokes and launch narratives are
individual author choices, not a required release-post formula.

## Add the post to the website

[The authoring notes](references/posts.md#website-authoring) point to frontmatter,
cover, snippet, and demo conventions when the task includes implementation.
