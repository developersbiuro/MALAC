import { Link, useParams } from "react-router-dom";
import { useSeo } from "../utils/seo.js";
import { getBlogPost } from "../data/blogPosts.js";

// Renders **bold** segments and [label](url) links inside a plain-text
// string; everything else stays plain text (no HTML injection anywhere).
// Internal "/..." links use react-router so navigation stays in the SPA.
const INLINE_TOKEN = /(\*\*.+?\*\*|\[[^\]]+\]\([^)]+\))/;

function renderInline(text, keyPrefix) {
  return String(text)
    .split(INLINE_TOKEN)
    .map((part, i) => {
      const key = `${keyPrefix}-${i}`;
      if (!part) return null;
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={key} className="font-semibold text-neutral-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const [, label, url] = link;
        if (url.startsWith("/")) {
          return (
            <Link key={key} to={url} className="font-medium text-lux-burnt hover:underline">
              {label}
            </Link>
          );
        }
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-lux-burnt hover:underline"
          >
            {label}
          </a>
        );
      }
      return <span key={key}>{part}</span>;
    });
}

function Block({ block, index }) {
  if (block.t === "h") {
    return (
      <h2 className="mt-9 mb-3 text-xl font-bold text-neutral-900">
        {block.x}
      </h2>
    );
  }
  if (block.t === "ul") {
    return (
      <ul className="my-4 list-disc space-y-1.5 pl-6 text-neutral-700 leading-relaxed">
        {block.x.map((item, i) => (
          <li key={i}>{renderInline(item, `ul-${index}-${i}`)}</li>
        ))}
      </ul>
    );
  }
  if (block.t === "ol") {
    return (
      <ol className="my-4 list-decimal space-y-1.5 pl-6 text-neutral-700 leading-relaxed">
        {block.x.map((item, i) => (
          <li key={i}>{renderInline(item, `ol-${index}-${i}`)}</li>
        ))}
      </ol>
    );
  }
  return (
    <p className="my-4 text-neutral-700 leading-relaxed">
      {renderInline(block.x, `p-${index}`)}
    </p>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPost(slug);

  useSeo(
    post
      ? {
          title: `${post.title} — MALAC Blog`,
          description: post.excerpt,
          jsonLd: {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BlogPosting",
                headline: post.title,
                description: post.excerpt,
                datePublished: post.date,
                author: { "@type": "Organization", name: "MALAC" },
                publisher: { "@type": "Organization", name: "MALAC" },
                mainEntityOfPage: `https://www.malac.pp.ua/blog/${post.slug}`,
              },
              ...(post.faqs?.length
                ? [
                    {
                      "@type": "FAQPage",
                      mainEntity: post.faqs.map((f) => ({
                        "@type": "Question",
                        name: f.q,
                        acceptedAnswer: { "@type": "Answer", text: f.a },
                      })),
                    },
                  ]
                : []),
            ],
          },
        }
      : { title: "Post not found — MALAC Blog" }
  );

  if (!post) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">
          Ye blog post nahi mila
        </h1>
        <p className="mt-3 text-neutral-600">
          The post you are looking for does not exist or has been moved.
        </p>
        <Link to="/blog" className="btn-lux mt-6 inline-flex px-5 py-2.5 text-sm">
          ← Back to Blog
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link to="/blog" className="text-sm font-medium text-lux-burnt hover:underline">
        ← All posts
      </Link>
      <p className="mt-6 text-xs uppercase tracking-wider text-neutral-500">
        {post.displayDate} · {post.readTime}
      </p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-bold leading-tight text-neutral-900">
        {post.title}
      </h1>
      <div className="mt-6 flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B]">
        <div className="text-center">
          <p className="text-xl font-bold tracking-[0.3em] text-white">MALAC</p>
          <p className="mx-auto mt-2 h-0.5 w-10 bg-amber-500" />
        </div>
      </div>

      <article className="mt-2">
        {post.body.map((block, i) => (
          <Block key={i} block={block} index={i} />
        ))}
      </article>

      <div className="mt-12 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-neutral-900">
          Ready to shop?
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Browse the full MALAC catalogue — Cash on Delivery available all over
          Pakistan.
        </p>
        <Link to="/shop" className="btn-lux mt-4 inline-flex px-6 py-2.5 text-sm">
          Shop Now
        </Link>
        <p className="mt-4 text-xs text-neutral-500">
          Questions? WhatsApp +92 323 6016684 · info@malac.pp.ua
        </p>
      </div>
    </main>
  );
}
