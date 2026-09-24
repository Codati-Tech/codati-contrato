/*
 * Unpublished-change marks.
 *
 * The dot is a sibling of the page, not a pseudo-element of the field:
 * `::after` does not draw on replaced elements like <img>, and giving the
 * field `position: relative` to anchor it would move whatever the site had
 * positioned against another ancestor. A dot of its own, in page coordinates,
 * shows on any element and leaves the site's layout exactly as it was.
 *
 * The colours are literal, like the rest of the bridge's CSS: the mark has to
 * show on any brand.
 */
const CSS = `
  [data-codati-mark] {
    all: initial;
    display: none;
    position: absolute;
    z-index: 2147483001;
    box-sizing: border-box;
    width: 12px;
    height: 12px;
    border: 2px solid #ffffff;
    border-radius: 999px;
    background: #f57a1a;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.32);
    pointer-events: none;
  }

  body.codati-editing [data-codati-mark] {
    display: block;
  }
`;

const TITLE = 'Alterado — ainda não publicado';
const SIZE = 12;

function injectMarkCss() {
  if (document.querySelector('style[data-codati-marks-css]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-codati-marks-css', '');
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** Marks every field the panel reports as changed since the last publication. */
export function instalarMarcas({ all, withAttr, injetarCss, onMensagem }) {
  injetarCss();
  injectMarkCss();

  // node -> { dot, title }: the title the site gave the node, restored on unmark.
  const marked = new Map();
  let frame = 0;

  function place() {
    frame = 0;
    const viewport = document.documentElement.clientWidth;
    marked.forEach(function (mark, node) {
      const rect = node.getBoundingClientRect();
      if (!node.isConnected || (rect.width === 0 && rect.height === 0)) {
        mark.dot.style.visibility = 'hidden';
        return;
      }
      // Overlapping the top-right corner, kept inside the viewport.
      const left = Math.max(0, Math.min(rect.right - SIZE / 2, viewport - SIZE));
      const top = Math.max(0, rect.top + window.scrollY - SIZE / 2);
      mark.dot.style.visibility = 'visible';
      mark.dot.style.left = left + window.scrollX + 'px';
      mark.dot.style.top = top + 'px';
    });
  }

  function schedule() {
    if (frame || marked.size === 0) return;
    frame = requestAnimationFrame(place);
  }

  // Text edits, image loads and resizes all move fields around.
  window.addEventListener('resize', schedule);
  document.addEventListener('input', schedule);
  document.addEventListener('load', schedule, true);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  if (observer) observer.observe(document.body);

  function unmark(node, mark) {
    node.removeAttribute('data-codati-changed');
    if (mark.title === null) node.removeAttribute('title');
    else node.setAttribute('title', mark.title);
    mark.dot.remove();
    if (observer) observer.unobserve(node);
  }

  function mark(node, path) {
    if (marked.has(node)) return;
    const dot = document.createElement('span');
    dot.setAttribute('data-codati-mark', path);
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    marked.set(node, { dot: dot, title: node.getAttribute('title') });
    node.setAttribute('data-codati-changed', '');
    node.setAttribute('title', TITLE);
    if (observer) observer.observe(node);
  }

  onMensagem('marks', function ({ paths }) {
    const wanted = new Map();
    if (Array.isArray(paths)) {
      paths.forEach(function (path) {
        if (typeof path !== 'string') return;
        withAttr('data-codati-path', path)
          .concat(withAttr('data-codati-link', path))
          .forEach(function (node) {
            if (!wanted.has(node)) wanted.set(node, path);
          });
      });
    }

    marked.forEach(function (entry, node) {
      if (!wanted.has(node)) {
        unmark(node, entry);
        marked.delete(node);
      }
    });
    // A node the bridge re-rendered is gone; its stray dot must go with it.
    all('[data-codati-mark]').forEach(function (dot) {
      let owned = false;
      marked.forEach(function (entry) {
        if (entry.dot === dot) owned = true;
      });
      if (!owned) dot.remove();
    });
    wanted.forEach(function (path, node) {
      mark(node, path);
    });
    place();
  });
}
