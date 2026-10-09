"use client";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { formatMathTitle } from "@/lib/format-math";

/** Render math safely without allowing authored HTML or active links in card copy. */
export default function MathCopy({ text }: { text: string }) {
  return <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({ children }) => <span>{children}</span>, a: ({ children }) => <span>{children}</span> }}>{formatMathTitle(text)}</ReactMarkdown>;
}
