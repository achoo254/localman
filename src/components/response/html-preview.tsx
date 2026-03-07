/**
 * Sandboxed iframe for HTML response preview (no script execution, no same-origin access).
 */

interface HtmlPreviewProps {
  body: string;
}

export function HtmlPreview({ body }: HtmlPreviewProps) {
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
  return (
    <iframe
      title="Response preview"
      srcDoc={srcDoc}
      sandbox=""
      className="w-full min-h-[200px] border-0 rounded bg-white text-black"
    />
  );
}
