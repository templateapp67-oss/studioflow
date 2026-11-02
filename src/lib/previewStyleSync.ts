/**
 * Keeps a preview document's stylesheets in sync with the host app.
 *
 * Why this exists — the template preview modal renders the real website inside
 * an isolated `srcdoc` iframe. The template bundles are code-split, so their
 * CSS (for example `vedaSanjeevani.css` for Template 14) only reaches the host
 * `<head>` *after* the lazy chunk finishes loading — which is after the iframe
 * has already copied whatever styles it could see at load time. Without live
 * syncing, every lazily loaded template renders inside the iframe as unstyled
 * text with oversized raw images.
 *
 * `syncPreviewStyles(targetDocument)`:
 *   1. Mirrors every current `<style>` / `<link rel="stylesheet">` (plus font
 *      preconnect/preload hints) into the preview document.
 *   2. Watches the host document with a MutationObserver and mirrors styles
 *      that are added later (lazy chunks, Vite dev injection, HMR updates)
 *      and removes mirrored copies when the source is removed.
 *   3. Keeps `<style>` text content up to date (Vite HMR rewrites text nodes
 *      in place during development).
 *
 * Returns a cleanup function that disconnects the observer and removes the
 * mirrored nodes. Safe to call in any environment — it is a no-op without a
 * real DOM (SSR / test renderers).
 */
export function syncPreviewStyles(target: Document): () => void {
  if (
    typeof document === 'undefined' ||
    typeof document.querySelectorAll !== 'function' ||
    !target ||
    !target.head ||
    typeof target.head.appendChild !== 'function'
  ) {
    return () => {};
  }

  /** Host node → mirrored node living in the preview document. */
  const mirrored = new Map<Node, Element>();

  const isMirrorable = (node: Node): node is HTMLStyleElement | HTMLLinkElement => {
    if (!(node instanceof Element)) return false;
    const tag = node.tagName;
    if (tag === 'STYLE') return true;
    if (tag !== 'LINK') return false;
    const rel = (node.getAttribute('rel') || '').toLowerCase();
    // Stylesheets plus the font hints they rely on (Google Fonts preconnect).
    return rel.includes('stylesheet') || rel === 'preconnect' || rel === 'preload';
  };

  const adopt = (node: Node) => {
    if (!isMirrorable(node) || mirrored.has(node)) return;
    try {
      const clone = target.importNode(node, true) as Element;
      clone.setAttribute('data-preview-mirror', 'true');
      mirrored.set(node, clone);
      target.head.appendChild(clone);
    } catch {
      /* A detached or foreign node that cannot be imported — skip it. */
    }
  };

  const drop = (node: Node) => {
    const clone = mirrored.get(node);
    if (clone) {
      clone.remove();
      mirrored.delete(node);
    }
  };

  const collect = (root: Node) => {
    adopt(root);
    if (root instanceof Element || root instanceof Document) {
      root.querySelectorAll('style, link[rel]').forEach(adopt);
    }
  };

  collect(document.documentElement);

  /** Re-copy `<style>` text (Vite HMR edits text nodes in place). */
  let scheduled = 0;
  const refreshStyleText = () => {
    scheduled = 0;
    mirrored.forEach((clone, source) => {
      if (source instanceof HTMLStyleElement && clone.textContent !== source.textContent) {
        clone.textContent = source.textContent;
      }
    });
  };

  const observer =
    typeof MutationObserver === 'function'
      ? new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            mutation.addedNodes.forEach(collect);
            mutation.removedNodes.forEach((node) => {
              drop(node);
              if (node instanceof Element) node.querySelectorAll('style, link[rel]').forEach(drop);
            });
          }
          if (!scheduled) {
            scheduled =
              typeof requestAnimationFrame === 'function'
                ? requestAnimationFrame(refreshStyleText)
                : (refreshStyleText(), 0);
          }
        })
      : null;
  observer?.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  return () => {
    observer?.disconnect();
    if (scheduled && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(scheduled);
    mirrored.forEach((clone) => clone.remove());
    mirrored.clear();
  };
}
