# Release post examples

Paths below are relative to the repository root. Version posts live in
`packages/website/src/page/blog/post/`.

Choose examples by the announcement's shape; there is no need to reread the whole
archive for each draft.

| Post                 | What to borrow                                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `foldkit-0-167-0.md` | Current default balance: short feature explanations, a reused chat demo, one API snippet, an old/new rename table, and release notes for complete migrations. Its server-rendering section introduces the Node adapter without becoming a setup guide. |
| `foldkit-0-166-0.md` | A substantial API can justify several snippets. The Query section follows definition, loading, and rendering, then gives smaller changes less space. It explicitly covers 0.165.0 and 0.166.0.                                                         |
| `foldkit-0-164-0.md` | Several features explained without code blocks. Useful when the change is understandable from behavior alone.                                                                                                                                          |
| `foldkit-0-163-0.md` | A brief rename section names both `evo` and `modifyFields` and states that behavior is unchanged. The opening establishes a combined release scope.                                                                                                    |
| `foldkit-0-161-0.md` | A broad release with substantial API explanations. Consult individual sections when similar detail is warranted; its length and feature inventory are not a default target.                                                                            |
| `foldkit-0-159-0.md` | One headline change, a portable server bundle, with a configuration snippet and a list of other changes.                                                                                                                                               |
| `foldkit-0-158-0.md` | A focused Machine release organized around related capabilities within one topic.                                                                                                                                                                      |
| `foldkit-0-157-0.md` | Before/after snippets make changed call shapes visible. The culinary opening is an individual voice choice.                                                                                                                                            |
| `foldkit-0-155-0.md` | Combined releases with a meaningful before/after Mount example and inline contributor thanks.                                                                                                                                                          |

Some of these posts include an “Upgrading” section or migration recipes. The
current editorial preference is to link to release notes for that guidance, as
0.167.0 does.

The other posts serve different purposes: `foldkit-has-server-rendering.md` is a
longer feature launch, `dispatch-1.md` is fiction, and
`introducing-the-foldkit-blog.md` announces the blog itself. Their narrative shapes
do not establish a template for version announcements.

## Website authoring

- Add Markdown at `packages/website/src/page/blog/post/<slug>.md`. `posts.ts`
  discovers these files automatically and derives each slug from its filename.
- Frontmatter requires `title`, `description`, and a `YYYY-MM-DD` date. Version
  titles normally use `Foldkit <version>`; the description summarizes the selected
  highlights for the index and page metadata.
- Cover metadata is optional, but supply all four fields together when used:
  `coverImage`, `coverImageAlt`, `coverImageWidth`, and `coverImageHeight`. Follow
  the existing `/blog/<slug>/cover.<extension>` public-asset convention and use
  the image's actual pixel dimensions. The schema is in `frontmatter.ts`.
- Follow the repository's `::Snippet` convention for source examples, with source
  files in `packages/website/src/snippet/`. The registry in
  `packages/website/src/markdown/snippets.ts` discovers supported source files
  automatically. The filename without its extension becomes the `name` in the
  matching `::Snippet` directive.
- For a live island, inspect `post/foldkit-0-167-0.ts` and `packages/website/src/view/blog.ts`. The release
  post's `::Demo{name="chat"}` slot reuses the VirtualList guide's demo. Markdown
  discovery alone does not wire up a custom demo.
