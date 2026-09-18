class BlogClient extends Query.HttpApi.Service<BlogClient>()('BlogClient', {
  api: BlogApi,
}) {}

const postsQuery = BlogClient.query('Posts', 'blog', 'listPosts')
const postQuery = BlogClient.query('Post', 'blog', 'getPost')
