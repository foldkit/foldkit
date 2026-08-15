import { Order } from 'effect'

// BLOG METADATA

/**
 * The blog's own title and description, shared by the rendered index, the
 * page metadata the prerender writes into each document, and the RSS channel.
 *
 * Kept dependency-light (Effect only) so `scripts/` can import it under tsx
 * without pulling in the browser view layer.
 */
export const BLOG_TITLE = 'Blog'

export const BLOG_DESCRIPTION =
  'Announcements, musings, and technical deep dives.'

/** The section every blog page reports, both in llms.txt and on OG images. */
export const BLOG_SECTION = 'Blog'

/**
 * The byline every post carries. A site-level constant rather than a
 * frontmatter field because the blog has one author; the first guest post
 * promotes this into frontmatter as a key into an author registry.
 */
export const BLOG_AUTHOR = 'Devin Jameson'

/**
 * Where the feed lives. The prerender writes the file here and the blog index
 * links to it. `index.html` advertises the same path on its `rel="alternate"`
 * link, which is static HTML and cannot import this.
 */
export const BLOG_RSS_PATH = '/blog/rss.xml'

type DatedPost = Readonly<{
  slug: string
  frontmatter: Readonly<{ date: string }>
}>

/**
 * Newest first, ties broken by slug descending. Both post registries sort with
 * this one Order, so the rendered index, the sitemap, and the RSS feed cannot
 * disagree about the order posts appear in.
 */
export const byDateThenSlugDescending: Order.Order<DatedPost> = Order.flip(
  Order.combine(
    Order.mapInput(Order.String, (post: DatedPost) => post.frontmatter.date),
    Order.mapInput(Order.String, (post: DatedPost) => post.slug),
  ),
)
