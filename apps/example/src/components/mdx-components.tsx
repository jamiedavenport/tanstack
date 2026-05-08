import type { ComponentPropsWithoutRef } from "react";
import { WindowFrame } from "./CodeBlock";

type PreProps = ComponentPropsWithoutRef<"pre"> & {
  "data-file"?: string;
  "data-tag"?: string;
};

export const mdxComponents = {
  pre: ({ "data-file": file, "data-tag": tag, ...props }: PreProps) => {
    if (!file) return <pre {...props} />;
    return (
      <WindowFrame title={file} right={tag}>
        <div className="min-h-0 flex-1 overflow-auto p-6 text-[0.8125rem]">
          <pre {...props} />
        </div>
      </WindowFrame>
    );
  },
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-12 text-2xl font-semibold tracking-tight text-zinc-900" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-8 text-xl font-semibold tracking-tight text-zinc-900" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mt-5 text-pretty text-zinc-700" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="mt-6 border-l-2 border-blue-600 pl-6 text-xl text-pretty text-zinc-900"
      {...props}
    />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mt-5 list-disc space-y-2 pl-6 text-zinc-700" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mt-5 list-decimal space-y-2 pl-6 text-zinc-700" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a
      className="text-blue-600 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-600"
      {...props}
    />
  ),
  code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code">) => {
    if (typeof children !== "string") {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[0.875em] text-zinc-900 ring-1 ring-zinc-200 whitespace-nowrap"
        {...props}
      >
        {children}
      </code>
    );
  },
};
