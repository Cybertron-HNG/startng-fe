import { longDate, POSTS, type Post } from "./blog-posts";
import { Markdown } from "./markdown";

// The blog's words and layout as plain markup (no data fetching), so the build can write them into the pages
// (vite.config.ts) and the app draws exactly the same (src/Blog.tsx).

/** start.ng/blog: every post, newest first. */
export function BlogIndexView() {
  return (
    <main className="container blog">
      <p className="eyebrow">Blog</p>
      <h1>The start.ng blog</h1>
      <p className="lead-sm">Guides for making and publishing browser games, and how start.ng works.</p>
      <ul className="blog-list">
        {POSTS.map((p) => (
          <li key={p.slug}>
            <a href={`/blog/${p.slug}`}>{p.title}</a>
            <time dateTime={p.date}>{longDate(p.date)}</time>
            <p>{p.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

/** start.ng/blog/<slug>: one post, from its Markdown. */
export function BlogPostView({ post, source }: { post: Post; source: string }) {
  return (
    <main className="container blog">
      <p className="blog-back"><a href="/blog">← All posts</a></p>
      <article className="docs-body blog-post">
        <time dateTime={post.date}>{longDate(post.date)}</time>
        <Markdown source={source} />
      </article>
    </main>
  );
}
