import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import { me, User } from "./api";
import { postBySlug } from "./blog-posts";
import { BlogIndexView, BlogPostView } from "./BlogView";
import NotFound from "./NotFound";
import ScrollJump from "./ScrollJump";
import { PAGES, setSeo } from "./seo";
import SiteFooter from "./SiteFooter";
import ThemeToggle from "./ThemeToggle";

// start.ng/blog and start.ng/blog/<slug> (Ziki #27). The posts are Markdown files in public/blog (listed in src/blog-posts.ts),
// so the page the build writes and this one never disagree.
export default function Blog({ slug }: { slug?: string }) {
  const post = slug ? postBySlug(slug) : undefined;
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) me(token).then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!slug) { setSeo(PAGES.blog); return; }
    if (!post) return;
    setSeo({ title: `${post.title} · start.ng`, description: post.description, path: `/blog/${post.slug}` });
    fetch(`/blog/${post.slug}.md`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then(setSource)
      .catch(() => setFailed(true));
  }, [slug, post]);

  if (slug && !post) return <NotFound />;

  function signOut() {
    localStorage.removeItem("token");
    setUser(null);
    location.assign("/");
  }

  return (
    <>
      <header className="container nav">
        <a className="logo" href="/"><b>start<span>.ng</span></b></a>
        <nav aria-label="Pages">
          <a href="/games">Games</a>
          <a href="/creators">Creators</a>
          <a href="/docs">Docs</a>
        </nav>
        <div className="nav-account">
          <ThemeToggle />
          {user ? (
            <AccountMenu user={user} onProfile={() => location.assign("/?profile")} onFavorites={() => location.assign("/?favorites")} onSignOut={signOut} />
          ) : (
            <button onClick={() => location.assign("/?signin")}>Sign in</button>
          )}
        </div>
      </header>
      {!post ? <BlogIndexView /> : source ? <BlogPostView post={post} source={source} /> : (
        <main className="container blog">
          {failed ? <p className="error">Couldn't load this post. Try again in a moment.</p> : <p className="empty">Loading…</p>}
        </main>
      )}
      <SiteFooter />
      <ScrollJump />
    </>
  );
}
