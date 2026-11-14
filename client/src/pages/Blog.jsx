import { Link } from "react-router-dom";
import { useSeo } from "../utils/seo.js";
import { BLOG_POSTS } from "../data/blogPosts.js";

// Public blog index. Browsing is public (same rule as the rest of the
// storefront), the page is indexable, and posts live in
// client/src/data/blogPosts.js.
export default function Blog() {
  useSeo({
    title: "MALAC Blog — Online Shopping Guides & Store News",
    description:
      "The MALAC blog: how online shopping at MALAC works, delivery and payment guides, store news and shopping tips for customers across Pakistan.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "MALAC Blog",
      url: "https://www.malac.pp.ua/blog",
      publisher: {
        "@type": "Organization",
        name: "MALAC",
        url: "https://www.malac.pp.ua/",
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <p className="eyebrow mb-2">MALAC Blog</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900">
        Shopping guides &amp; store news
      </h1>
      <p className="mt-3 max-w-2xl text-neutral-600 leading-relaxed">
        How MALAC works, how to order and pay, delivery guides and new things
        happening at the store — written for our customers across Pakistan.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.slug}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <Link to={`/blog/${post.slug}`} className="block">
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E293B]">
                <div className="text-center">
                  <p className="text-2xl font-bold tracking-[0.3em] text-white">
                    MALAC
                  </p>
                  <p className="mx-auto mt-2 h-0.5 w-10 bg-amber-500" />
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-neutral-300">
                    M.A Luxury Apparel Collection
                  </p>
                </div>
              </div>
            </Link>
            <div className="p-5">
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                {post.displayDate} · {post.readTime}
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-snug text-neutral-900">
                <Link to={`/blog/${post.slug}`} className="hover:text-lux-burnt">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {post.excerpt}
              </p>
              <Link
                to={`/blog/${post.slug}`}
                className="mt-4 inline-block text-sm font-medium text-lux-burnt hover:underline"
              >
                Read more →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
