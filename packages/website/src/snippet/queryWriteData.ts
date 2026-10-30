const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPostsMessage: ({ message }) => posts.fold(model, message),
    GotPostMessage: ({ message }) => postDetails.fold(model, message),
    // The server returned the saved post, so write it without refetching.
    SucceededSavePost: ({ post }) =>
      Update.combine(model, [
        postDetails.setData({ args: { postId: post.id }, data: post }),
        posts.updateData(postList =>
          Array.map(postList, listedPost =>
            listedPost.id === post.id ? post : listedPost,
          ),
        ),
      ]),
    // Insert the created post into the list when the list has data.
    SucceededCreatePost: ({ post }) =>
      posts.updateData(model, postList => Array.append(postList, post)),
  })
