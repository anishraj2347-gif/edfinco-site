// Renders the parsed blog block list as React elements. Inline syntax supported: **bold** and
// [text](href). Internal links (/path, #hash) use plain anchors; external https links open in a
// new tab with rel="noopener noreferrer". Any other URL scheme (javascript:, data:, …) is dropped
// and rendered as plain text. No raw HTML is ever rendered.
import type { ReactNode } from "react";
import { inlineRegex, safeHref, type Block } from "@/lib/markdown";
import styles from "@/app/blog/blog.module.css";

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = inlineRegex();
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1] !== undefined) {
      out.push(<strong key={key}>{m[1]}</strong>);
    } else {
      const link = safeHref(m[3]);
      out.push(
        link ? (
          <a
            key={key}
            href={link.href}
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {m[2]}
          </a>
        ) : (
          m[2]
        )
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function BlogMarkdown({ blocks }: { blocks: Block[] }) {
  return (
    <div className={styles.prose}>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.type) {
          case "h2":
            return <h2 key={k}>{inline(b.text, k)}</h2>;
          case "h3":
            return <h3 key={k}>{inline(b.text, k)}</h3>;
          case "quote":
            return <blockquote key={k}>{inline(b.text, k)}</blockquote>;
          case "ul":
          case "ol": {
            const List = b.type;
            return (
              <List key={k}>
                {b.items.map((it, j) => (
                  <li key={`${k}-${j}`}>{inline(it, `${k}-${j}`)}</li>
                ))}
              </List>
            );
          }
          default:
            return <p key={k}>{inline(b.text, k)}</p>;
        }
      })}
    </div>
  );
}
