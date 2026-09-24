/**
 * A ponte da prévia: uma implementação, importada, no lugar de uma cópia por site.
 *
 * Até 2026-09-21 este código era um `<script is:inline>` de 626 linhas dentro do
 * `PreviewBridge.astro`, e por isso vivia copiado: script embutido não importa
 * nada. Eram três implementações — 747 linhas no molde e na Aurora, 727 na
 * ConheSer e 265 no `codati-site` —, e o mesmo conserto precisava ser feito à
 * mão em cada uma. A comparação está em
 * `specs/13-integracao-dos-sites/COMPARACAO-DAS-PONTES.md`.
 *
 * O `.astro` agora só declara os valores num elemento marcador e chama daqui.
 * O CSS vem junto, injetado uma vez: ele é enfeite de editor e nunca chega ao
 * site publicado, então o momento em que entra não importa — e deixá-lo no
 * `.astro` manteria um terço do arquivo copiado.
 *
 * Quem exercita isto é `tests/editor-no-navegador.mjs`, num Chromium de
 * verdade: 29 verificações. **Ele não roda com o `.env` do repositório
 * presente** — ver `tests/ferramentas/LEIA-ME.md`.
 */

import { instalarMarcas } from './marcas.js';

/** O elemento que o `.astro` deixa na página com os valores da prévia. */
const MARCADOR = '[data-codati-ponte]';

const CSS = '\n  /*\n    Affordances live behind a body class so the markup is identical to the\n    published page until the panel says it is in editing mode.\n\n    The colours are literal on purpose: the editing frame has to show on any\n    brand, and an outline in the client\'s colour over the client\'s background\n    is an invisible outline.\n  */\n  body.codati-editing [data-codati-path] {\n    outline: 1px dashed rgba(127, 127, 127, 0.55);\n    outline-offset: 3px;\n    cursor: text;\n    transition: outline-color 120ms ease, background-color 120ms ease;\n  }\n\n  body.codati-editing [data-codati-path][data-codati-kind=\'image\'],\n  body.codati-editing [data-codati-path][data-codati-kind=\'richtext\'] {\n    cursor: pointer;\n  }\n\n  body.codati-editing [data-codati-path]:hover {\n    outline: 2px solid #2bb3c0;\n    background-color: rgba(43, 179, 192, 0.08);\n  }\n\n  /* Marked by the site, not described by the platform: shown as the page, not as a field. */\n  body.codati-editing [data-codati-path][data-codati-locked] {\n    outline: none;\n    background-color: transparent;\n    cursor: auto;\n  }\n\n  body.codati-editing [data-codati-path][data-codati-active] {\n    outline: 2px solid #f57a1a;\n    background-color: rgba(245, 122, 26, 0.1);\n  }\n\n  /* An empty field would collapse to nothing and be impossible to click. */\n  /* Small whatever the field\'s own size: an empty headline is a hint, not a headline. */\n  body.codati-editing [data-codati-empty]::before {\n    content: attr(data-codati-placeholder);\n    opacity: 0.6;\n    font-size: min(1em, 1rem);\n    font-style: italic;\n    font-weight: 400;\n    letter-spacing: normal;\n    text-transform: none;\n  }\n\n  /*\n   * An empty spot is the editor talking, and the visitor never sees it.\n   *\n   * Until 2026-09-21 it wore the same dashed outline as real content, so the\n   * client could not tell the two apart and read the preview as a promise the\n   * site would not keep: "o editor mostra uma coisa e meu site é outra". The\n   * dotted line and the tint say, without words, that this belongs to the tool.\n   */\n  body.codati-editing [data-codati-empty] {\n    outline-style: dotted;\n    outline-color: rgba(127, 127, 127, 0.75);\n    background-color: rgba(127, 127, 127, 0.06);\n  }\n\n  body.codati-editing [data-codati-item][data-codati-flash] {\n    outline: 2px solid #f57a1a;\n    outline-offset: 4px;\n  }\n\n  [data-codati-ui] {\n    all: initial;\n    position: absolute;\n    z-index: 2147483000;\n    display: none;\n    gap: 4px;\n    align-items: center;\n    font: 500 12px/1 system-ui, -apple-system, \'Segoe UI\', sans-serif;\n  }\n\n  [data-codati-ui][data-codati-ui-inline] {\n    position: static;\n    display: inline-flex;\n    margin: 8px 0;\n  }\n\n  [data-codati-ui] button {\n    all: unset;\n    box-sizing: border-box;\n    display: inline-flex;\n    align-items: center;\n    gap: 6px;\n    max-width: 22rem;\n    padding: 7px 11px;\n    border-radius: 999px;\n    background: rgba(17, 24, 39, 0.92);\n    color: #fff;\n    font: inherit;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    cursor: pointer;\n    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);\n  }\n\n  [data-codati-ui] button:hover,\n  [data-codati-ui] button:focus-visible {\n    background: #0f766e;\n  }\n\n  [data-codati-ui] button[disabled] {\n    opacity: 0.4;\n    cursor: not-allowed;\n  }\n';

function configuracao() {
    const no = document.querySelector(MARCADOR);
    if (!no) return null;
    return {
        panelOrigin: no.getAttribute('data-panel-origin') || '',
        emptyImage: no.getAttribute('data-empty-image') || '',
        contractAttribute: no.getAttribute('data-contract-attribute') || '',
    };
}

function injetarCss() {
    if (document.querySelector('style[data-codati-ponte-css]')) return;
    const estilo = document.createElement('style');
    estilo.setAttribute('data-codati-ponte-css', '');
    estilo.textContent = CSS;
    document.head.appendChild(estilo);
}

/**
 * Liga a ponte. Sem o marcador na página não faz nada — é o que a mantém
 * inerte fora da rota de prévia.
 */
export function iniciarPonte() {
    const config = configuracao();
    if (!config) return;

    injetarCss();

    var panelOrigin = config.panelOrigin;
    var emptyImage = config.emptyImage;
    var contractAttribute = config.contractAttribute;

    /**
       * The preview bridge.
       *
       * Inline and dependency-free on purpose: it has to run before the client
       * touches anything, and it must not depend on the site's own bundling, which
       * differs from template to template.
       */
      (function () {
        var PANEL_ORIGIN = panelOrigin;
        var EMPTY_IMAGE = emptyImage;
        var CONTRACT_ATTRIBUTE = contractAttribute;
        // A destination that cannot run script. The panel validates before it
        // sends; this is the second lock on the same door.
        // A mesma regra de `isAcceptableLink` da api (spec 1108 H2-8): link relativo
        // sem esquema é aceito ("contato.html", "../midia.html", "?utm=x", "#secao");
        // com esquema, só http(s), mailto e tel; "//" e qualquer outro esquema não.
        var SAFE_HREF = /^(?!\/\/)(?:https?:\/\/|mailto:|tel:|[^:\/?#]*(?:[\/?#]|$))/i;

        var active = null;
        var hovered = null;
        var editing = false;
        var labels = {};
        var listRules = {};
        // The paths the platform describes, or null when the panel did not say.
        var editable = null;
        var ui = null;
        var hideTimer = null;
        var tratadoresDeMensagem = {};

        function onMensagem(tipo, fn) {
          if (!tratadoresDeMensagem[tipo]) tratadoresDeMensagem[tipo] = [];
          tratadoresDeMensagem[tipo].push(fn);
        }

        function send(type, payload) {
          if (window.parent === window) return;
          window.parent.postMessage(
            Object.assign({ source: 'codati-preview', type: type }, payload || {}),
            PANEL_ORIGIN,
          );
        }

        // The paths come from our own markup, but they end up inside a selector,
        // so they get escaped rather than trusted.
        function cssEscape(value) {
          return String(value).replace(/["\\]/g, '\\$&');
        }

        function all(selector, root) {
          return Array.prototype.slice.call((root || document).querySelectorAll(selector));
        }

        function withAttr(attr, value) {
          return all('[' + attr + '="' + cssEscape(value) + '"]');
        }

        function parentPath(path) {
          return path.slice(0, path.lastIndexOf('.'));
        }

        function indexOf(path) {
          return Number(path.slice(path.lastIndexOf('.') + 1));
        }

        function kindOf(node) {
          return node.getAttribute('data-codati-kind') || 'text';
        }

        function isOpen(path) {
          return editable === null || editable.indexOf(path) !== -1;
        }

        // A node the platform does not describe is locked: typed into, it would
        // look saved and be dropped when the draft is saved.
        function markLocked() {
          all('[data-codati-path]').forEach(function (node) {
            if (isOpen(node.getAttribute('data-codati-path'))) node.removeAttribute('data-codati-locked');
            else node.setAttribute('data-codati-locked', '');
          });
        }

        function itemsOf(listPath) {
          return all('[data-codati-item]').filter(function (node) {
            return parentPath(node.getAttribute('data-codati-item')) === listPath;
          });
        }

        function unique(values) {
          return values.filter(function (value, i) {
            return values.indexOf(value) === i;
          });
        }

        /**
         * Which version of the edit contract this page declares.
         *
         * Read off `<html>` rather than compiled in from the constant, so what the
         * panel hears over postMessage and what the platform reads off the
         * published HTML are the same value by construction — one source, no way
         * for the two to drift apart.
         *
         * Absent means the page predates the numbering, and the panel reads that
         * as version 1. A value that is not a number comes through as `NaN`, which
         * the panel reads as "I do not know this site" — which is the truth.
         */
        function contractVersion() {
          var raw = document.documentElement.getAttribute(CONTRACT_ATTRIBUTE);
          return raw === null ? undefined : Number(raw);
        }

        function inventory() {
          return {
            contract: contractVersion(),
            fields: all('[data-codati-path]').map(function (node) {
              return { path: node.getAttribute('data-codati-path'), kind: kindOf(node) };
            }),
            sections: all('[data-codati-section]').map(function (node) {
              return {
                path: node.getAttribute('data-codati-section'),
                type: node.getAttribute('data-codati-section-type'),
                // The address a link can use to land here, or null: the panel
                // offered every section as "Parte desta página" and only the
                // form had an `id`, so the other choices built links that went
                // nowhere, in silence (2026-09-22).
                anchor: node.id || null,
              };
            }),
            links: unique(
              all('[data-codati-link]').map(function (node) {
                return node.getAttribute('data-codati-link');
              }),
            ).map(function (path) {
              return { path: path };
            }),
            lists: unique(
              all('[data-codati-list]').map(function (node) {
                return node.getAttribute('data-codati-list');
              }),
            ).map(function (path) {
              return { path: path, count: itemsOf(path).length };
            }),
          };
        }

        // ─── Empty fields ────────────────────────────────────────────────────────

        function markEmpty(node) {
          /*
           * A imagem não tem texto para medir, mas tem um vazio próprio: o
           * `EMPTY_IMAGE`, que o molde desenha no lugar da foto que não existe. O
           * `src` é comparado com a constante que esta ponte já recebe, para a foto
           * de espaço reservado ganhar a mesma marcação visual dos campos vazios —
           * senão ela é o único pedaço de enfeite do editor que se parece com
           * conteúdo de verdade.
           */
          if (kindOf(node) === 'image') {
            if (node.getAttribute('src') === emptyImage) {
              node.setAttribute('data-codati-empty', '');
            } else {
              node.removeAttribute('data-codati-empty');
            }
            return;
          }

          if (node.textContent.trim() !== '') {
            node.removeAttribute('data-codati-empty');
            return;
          }

          // Just the field's name: the dashed outline already says "click here",
          // and a sentence in every empty spot buries the page being edited.
          var label = labels[node.getAttribute('data-codati-path')];
          node.setAttribute('data-codati-empty', '');
          node.setAttribute('data-codati-placeholder', '+ ' + (label || 'Escrever'));
        }

        function markAllEmpty() {
          all('[data-codati-path]').forEach(markEmpty);
        }

        // A list with no entries has no height, so nothing to hover to find the
        // add control. It gets the control inside it instead.
        function syncEmptyLists() {
          all('[data-codati-ui-inline]').forEach(function (node) {
            node.parentNode.removeChild(node);
          });
          if (!editing) return;

          all('[data-codati-list]').forEach(function (list) {
            var path = list.getAttribute('data-codati-list');
            var rule = listRules[path];
            if (!rule || !rule.canAdd || itemsOf(path).length > 0) return;

            var holder = document.createElement('div');
            holder.setAttribute('data-codati-ui', '');
            holder.setAttribute('data-codati-ui-inline', '');
            holder.appendChild(
              button('+ Adicionar ' + rule.itemLabel, function () {
                send('list', { path: path, action: 'add', index: 0 });
              }),
            );
            list.appendChild(holder);
          });
        }

        // ─── Editing a text in place ─────────────────────────────────────────────

        function deactivate() {
          if (!active) return;
          active.removeAttribute('contenteditable');
          active.removeAttribute('data-codati-active');
          markEmpty(active);
          active = null;
          refresh();
        }

        function activate(node) {
          if (active === node) return;
          deactivate();
          active = node;
          node.setAttribute('data-codati-active', '');

          if (kindOf(node) === 'text') {
            // The template's indentation is text too. Left in, the caret lands
            // after it and every value reaches the panel wrapped in whitespace.
            var trimmed = node.textContent.trim();
            if (node.children.length === 0 && node.textContent !== trimmed) node.textContent = trimmed;
            node.setAttribute('contenteditable', 'plaintext-only');
            node.focus();
          }
          refresh();
        }

        function onClick(event) {
          if (!editing) return;
          if (event.target.closest('[data-codati-ui]')) return;

          var node = event.target.closest('[data-codati-path]:not([data-codati-locked])');

          // Links and buttons would navigate away from the preview, or send the
          // form, and strand the client on a page the editor is not driving. A
          // summary still opens: it is how the client reaches an answer to edit it.
          var interactive = event.target.closest('a, button');
          if (interactive) event.preventDefault();

          if (!node) {
            deactivate();
            send('blur');
            return;
          }

          var kind = kindOf(node);
          var path = node.getAttribute('data-codati-path');

          if (node !== active) deactivate();
          send('select', { path: path, kind: kind });

          if (kind === 'image') {
            send('pick-image', { path: path, value: currentImage(node) });
            return;
          }

          if (kind === 'richtext') {
            // Stored as markdown or HTML and shown rendered. Typing into the
            // rendered HTML would have to be converted back, so the panel edits it
            // in a text editor instead.
            send('edit-richtext', { path: path });
            return;
          }

          activate(node);
        }

        function currentImage(node) {
          var img = node.tagName === 'IMG' ? node : node.querySelector('img');
          var src = img ? img.getAttribute('src') || '' : '';
          return src === EMPTY_IMAGE ? '' : src;
        }

        function onInput(event) {
          var node = event.target.closest('[data-codati-path]');
          if (!node || node !== active) return;

          send('change', {
            path: node.getAttribute('data-codati-path'),
            // The browser keeps a typed trailing space visible as a no-break space.
            value: node.textContent.replace(/\u00a0/g, ' '),
          });
          markEmpty(node);
          refresh();
        }

        function onKeyDown(event) {
          // The shortcut typed in here never reaches the panel (another
          // origin), and the browser's own undo would rewind the field behind
          // the draft's back. The panel's history decides instead.
          if (editing && (event.ctrlKey || event.metaKey) && !event.altKey) {
            var key = String(event.key).toLowerCase();
            var redo = key === 'y' || (key === 'z' && event.shiftKey);
            if (key === 'z' || redo) {
              event.preventDefault();
              send(redo ? 'redo' : 'undo');
              return;
            }
          }
          if (!active || event.target !== active) return;
          // A field on the page is one line. Enter finishes it, as Escape does,
          // rather than putting a line break the page would not show.
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            active.blur();
            deactivate();
            send('blur');
            return;
          }
          // Inside a <summary> the space bar opens and closes the <details> and
          // the space never reaches the text: "Nova pergunta" was saved as
          // "Novapergunta" in the FAQ (2026-09-22). The space is typed by hand.
          if (event.key === ' ' && active.closest && active.closest('summary')) {
            event.preventDefault();
            document.execCommand('insertText', false, ' ');
          }
        }

        // ─── What the panel sends ────────────────────────────────────────────────

        function replaceItemPath(value, before, after) {
          if (value === before) return after;
          return value.indexOf(before + '.') === 0 ? after + value.slice(before.length) : value;
        }

        // A clone starts as a copy of its neighbour, bridge state included. It
        // leaves here as an empty entry: no caret, no highlight, no old words,
        // no old photo and no old destination.
        function clearClone(item) {
          [item].concat(all('*', item)).forEach(function (node) {
            node.removeAttribute('contenteditable');
            node.removeAttribute('data-codati-active');
            node.removeAttribute('data-codati-flash');
            node.removeAttribute('data-codati-changed');
          });
          all('[data-codati-path]', item).forEach(function (node) {
            if (kindOf(node) === 'image') {
              var image = node.tagName === 'IMG' ? node : node.querySelector('img');
              if (image) {
                image.setAttribute('src', EMPTY_IMAGE);
                image.removeAttribute('srcset');
              }
            } else {
              node.textContent = '';
            }
          });
          all('[data-codati-link]', item).forEach(function (node) {
            node.removeAttribute('href');
          });
        }

        /** Formats the number a variant draws, `data-codati-index="2"` padding it to two digits. */
        function drawnIndex(node, index) {
          var width = Number(node.getAttribute('data-codati-index')) || 0;
          var text = String(index + 1);
          while (text.length < width) text = '0' + text;
          return text;
        }

        // The index lives inside every path of the entry. A field left with the
        // old one would save the next keystroke into another entry, silently.
        function rewriteListPaths(listPath) {
          var items = itemsOf(listPath);
          var before = items.map(function (item) {
            return item.getAttribute('data-codati-item');
          });
          items.forEach(function (item, index) {
            var after = listPath + '.' + index;
            [item].concat(all('[data-codati-item], [data-codati-path], [data-codati-link]', item)).forEach(function (node) {
              ['data-codati-item', 'data-codati-path', 'data-codati-link'].forEach(function (attribute) {
                var value = node.getAttribute(attribute);
                if (value !== null) node.setAttribute(attribute, replaceItemPath(value, before[index], after));
              });
            });
            all('[data-codati-index]', item).forEach(function (node) {
              node.textContent = drawnIndex(node, index);
            });
          });
        }

        // `sections.1.items.3.question` → `#.question`, the same for every entry.
        function shapeIn(listPath, path) {
          var prefix = listPath + '.';
          if (typeof path !== 'string' || path.indexOf(prefix) !== 0) return null;
          var rest = path.slice(prefix.length);
          var dot = rest.indexOf('.');
          return dot === -1 ? '#' : '#' + rest.slice(dot);
        }

        /*
         * A new entry's paths are not in what the panel described when the mode
         * was set, and would be locked until the panel answers the inventory.
         * They are open when the same field of a sibling is, and borrow its
         * label for the empty spot.
         */
        function describeNewPaths(listPath) {
          var open = {};
          var names = {};
          (editable || []).forEach(function (path) {
            var shape = shapeIn(listPath, path);
            if (shape) open[shape] = true;
          });
          Object.keys(labels).forEach(function (path) {
            var shape = shapeIn(listPath, path);
            if (shape && !names[shape]) names[shape] = labels[path];
          });
          var added = editable ? editable.slice() : null;
          itemsOf(listPath).forEach(function (item) {
            all('[data-codati-path], [data-codati-link]', item).forEach(function (node) {
              var path = node.getAttribute('data-codati-path') || node.getAttribute('data-codati-link');
              var shape = shapeIn(listPath, path);
              if (!shape) return;
              if (added && open[shape] && added.indexOf(path) === -1) added.push(path);
              if (names[shape] && !labels[path]) labels[path] = names[shape];
            });
          });
          editable = added;
        }

        /** Applies a list action to the page itself (contract 2). False when it cannot. */
        function applyListAction(path, action, index) {
          var items = itemsOf(path);
          var item = items[index];
          if (action === 'add') {
            var last = items[items.length - 1];
            var source = item || last;
            if (!source) return false;
            var clone = source.cloneNode(true);
            clearClone(clone);
            // The panel appends the new entry to the draft, so the page does too.
            last.parentNode.insertBefore(clone, last.nextSibling);
          } else if (action === 'remove') {
            if (!item) return false;
            if (active && item.contains(active)) deactivate();
            if (hovered && item.contains(hovered)) hovered = null;
            item.parentNode.removeChild(item);
          } else {
            var neighbour = items[action === 'up' ? index - 1 : index + 1];
            if (!item || !neighbour) return false;
            if (action === 'up') item.parentNode.insertBefore(item, neighbour);
            else item.parentNode.insertBefore(neighbour, item);
          }
          rewriteListPaths(path);
          describeNewPaths(path);
          markLocked();
          markAllEmpty();
          syncEmptyLists();
          refresh();
          send('inventory', inventory());
          return true;
        }

        function applyPatch(path, value) {
          var text = typeof value === 'string' ? value : '';

          withAttr('data-codati-path', path).forEach(function (node) {
            var kind = kindOf(node);

            if (kind === 'image') {
              var img = node.tagName === 'IMG' ? node : node.querySelector('img');
              if (img && (text === '' || SAFE_HREF.test(text))) {
                img.setAttribute('src', text === '' ? EMPTY_IMAGE : text);
              }
              return;
            }

            // Rendered by the site from markdown; the panel reloads the page.
            if (kind === 'richtext') return;
            // The client is typing here; rewriting it would move the caret.
            if (node === active) return;

            // Never innerHTML: the value came over postMessage, and writing it as
            // markup would make the panel an injection route into the site.
            if (node.textContent !== text) node.textContent = text;
            markEmpty(node);
          });

          withAttr('data-codati-link', path).forEach(function (node) {
            if (text === '') node.removeAttribute('href');
            else if (SAFE_HREF.test(text)) node.setAttribute('href', text);
          });

          refresh();
        }

        function focusPath(path) {
          var node = withAttr('data-codati-path', path)[0];
          if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (kindOf(node) === 'text') activate(node);
            return;
          }

          var item = withAttr('data-codati-item', path)[0];
          if (!item) return;
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          item.setAttribute('data-codati-flash', '');
          setTimeout(function () {
            item.removeAttribute('data-codati-flash');
          }, 1600);
        }

        function onMessage(event) {
          if (event.origin !== PANEL_ORIGIN) return;
          var data = event.data;
          if (!data || data.source !== 'codati-panel') return;

          var tratadores = tratadoresDeMensagem[data.type];
          if (tratadores) {
            tratadores.forEach(function (tratar) {
              tratar(data);
            });
            return;
          }

          switch (data.type) {
            case 'mode':
              editing = Boolean(data.editing);
              labels = data.labels && typeof data.labels === 'object' ? data.labels : {};
              editable = Array.isArray(data.editable) ? data.editable : null;
              listRules = data.lists && typeof data.lists === 'object' ? data.lists : {};
              document.body.classList.toggle('codati-editing', editing);
              if (!editing) deactivate();
              markLocked();
              markAllEmpty();
              syncEmptyLists();
              refresh();
              break;
            case 'patch':
              if (typeof data.path === 'string') applyPatch(data.path, data.value);
              break;
            case 'focus':
              if (typeof data.path === 'string') focusPath(data.path);
              break;
            case 'blur':
              deactivate();
              break;
            case 'list-apply':
              if (
                contractVersion() >= 2 &&
                typeof data.path === 'string' &&
                ['add', 'remove', 'up', 'down'].indexOf(data.action) !== -1 &&
                Number.isInteger(data.index) &&
                !applyListAction(data.path, data.action, data.index)
              ) {
                send('list-apply-failed', { path: data.path });
              }
              break;
            case 'inventory':
              send('inventory', inventory());
              break;
          }
        }

        // ─── The controls over the page ──────────────────────────────────────────

        function button(text, onPress) {
          var el = document.createElement('button');
          el.type = 'button';
          el.textContent = text;
          // Keeps the caret where it is: pressing a control does not end the
          // typing it sits next to.
          el.addEventListener('mousedown', function (event) {
            event.preventDefault();
          });
          el.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (!el.disabled) onPress();
          });
          return el;
        }

        function floating() {
          var el = document.createElement('div');
          el.setAttribute('data-codati-ui', '');
          el.addEventListener('mouseenter', function () {
            clearTimeout(hideTimer);
          });
          document.body.appendChild(el);
          return el;
        }

        function buildUi() {
          ui = {
            link: floating(),
            image: floating(),
            rich: floating(),
            item: floating(),
            add: floating(),
          };

          ui.linkButton = button('', function () {
            var target = ui.link.target;
            if (target) {
              send('pick-link', {
                path: target.getAttribute('data-codati-link'),
                value: target.getAttribute('href') || '',
              });
            }
          });
          ui.link.appendChild(ui.linkButton);

          ui.image.appendChild(
            button('Trocar foto', function () {
              var target = ui.image.target;
              if (target) {
                send('pick-image', {
                  path: target.getAttribute('data-codati-path'),
                  value: currentImage(target),
                });
              }
            }),
          );

          ui.rich.appendChild(
            button('Editar texto', function () {
              var target = ui.rich.target;
              if (target) send('edit-richtext', { path: target.getAttribute('data-codati-path') });
            }),
          );

          function itemAction(action) {
            return function () {
              var target = ui.item.target;
              if (!target) return;
              var path = target.getAttribute('data-codati-item');
              send('list', { path: parentPath(path), action: action, index: indexOf(path) });
            };
          }

          ui.up = button('↑', itemAction('up'));
          ui.up.title = 'Mover para antes';
          ui.down = button('↓', itemAction('down'));
          ui.down.title = 'Mover para depois';
          ui.remove = button('Remover', itemAction('remove'));
          ui.item.appendChild(ui.up);
          ui.item.appendChild(ui.down);
          ui.item.appendChild(ui.remove);

          ui.addButton = button('', function () {
            var target = ui.add.target;
            if (!target) return;
            var path = target.getAttribute('data-codati-list');
            send('list', { path: path, action: 'add', index: itemsOf(path).length });
          });
          ui.add.appendChild(ui.addButton);
        }

        function hide(el) {
          el.style.display = 'none';
          el.target = null;
        }

        /**
         * Places a control against an element, in page coordinates, so it scrolls
         * with the page. Every placement overlaps the element by a few pixels: the
         * pointer has to reach the control without leaving what it belongs to.
         */
        function place(el, target, where) {
          el.target = target;
          el.style.display = 'flex';

          var rect = target.getBoundingClientRect();
          var sx = window.scrollX;
          var sy = window.scrollY;
          var width = el.offsetWidth;
          var height = el.offsetHeight;
          var top;
          var left;

          if (where === 'above') {
            top = rect.top - height + 4 < 0 ? rect.bottom - 4 : rect.top - height + 4;
            left = rect.left;
          } else if (where === 'corner') {
            top = rect.top + 6;
            left = rect.right - width - 6;
          } else if (where === 'inside-bottom') {
            top = rect.bottom - height - 8;
            left = rect.left + 8;
          } else {
            top = rect.bottom - height / 2;
            left = rect.left + rect.width / 2 - width / 2;
          }

          var viewport = document.documentElement.clientWidth;
          left = Math.max(4, Math.min(left, viewport - width - 4));
          el.style.top = top + sy + 'px';
          el.style.left = left + sx + 'px';
        }

        function refresh() {
          if (!ui) return;

          // What the pointer is over wins, and what is being typed into is the
          // fallback: typing in a button keeps its destination control in reach,
          // and pointing at another entry still offers that entry's controls.
          var find = function (selector) {
            if (!editing) return null;
            var over = hovered && hovered.closest ? hovered.closest(selector) : null;
            return over || (active ? active.closest(selector) : null);
          };

          var link = find('[data-codati-link]');
          if (link && !isOpen(link.getAttribute('data-codati-link'))) link = null;
          if (link) {
            var href = link.getAttribute('href') || '';
            ui.linkButton.textContent = href ? 'Destino: ' + href : 'Escolher destino';
            place(ui.link, link, 'above');
          } else hide(ui.link);

          var image = find('[data-codati-kind="image"]:not([data-codati-locked])');
          if (image) place(ui.image, image, 'inside-bottom');
          else hide(ui.image);

          var rich = find('[data-codati-kind="richtext"]:not([data-codati-locked])');
          if (rich) place(ui.rich, rich, 'corner');
          else hide(ui.rich);

          var item = find('[data-codati-item]');
          var itemPath = item ? item.getAttribute('data-codati-item') : null;
          var itemRule = itemPath ? listRules[parentPath(itemPath)] : null;
          if (item && itemRule && (itemRule.canMove || itemRule.canRemove)) {
            var index = indexOf(itemPath);
            var count = itemsOf(parentPath(itemPath)).length;
            ui.up.style.display = itemRule.canMove ? '' : 'none';
            ui.down.style.display = itemRule.canMove ? '' : 'none';
            ui.up.disabled = index === 0;
            ui.down.disabled = index >= count - 1;
            ui.remove.style.display = itemRule.canRemove ? '' : 'none';
            ui.remove.textContent = 'Remover ' + itemRule.itemLabel;
            // A rich text control already sits in that corner.
            place(ui.item, item, rich && item.contains(rich) ? 'inside-bottom' : 'corner');
          } else hide(ui.item);

          var list = item
            ? withAttr('data-codati-list', parentPath(itemPath))[0] || null
            : find('[data-codati-list]');
          var listRule = list ? listRules[list.getAttribute('data-codati-list')] : null;
          if (list && listRule && listRule.canAdd && itemsOf(list.getAttribute('data-codati-list')).length > 0) {
            ui.addButton.textContent = '+ Adicionar ' + listRule.itemLabel;
            place(ui.add, list, 'below');
          } else hide(ui.add);
        }

        function onHover(event) {
          if (!editing) return;
          var target = event.target;
          if (target.closest && target.closest('[data-codati-ui]')) {
            clearTimeout(hideTimer);
            return;
          }
          // A short grace before the controls move: crossing the few pixels
          // between an element and its control must not make the control vanish.
          clearTimeout(hideTimer);
          hideTimer = setTimeout(function () {
            hovered = target;
            refresh();
          }, 90);
        }

        function setup() {
          buildUi();

          instalarMarcas({
            all: all,
            withAttr: withAttr,
            injetarCss: injetarCss,
            onMensagem: onMensagem,
          });

          document.addEventListener('click', onClick, true);
          document.addEventListener('input', onInput);
          document.addEventListener('keydown', onKeyDown, true);
          document.addEventListener('mouseover', onHover, true);
          document.documentElement.addEventListener('mouseleave', function () {
            clearTimeout(hideTimer);
            hovered = null;
            refresh();
          });
          // Nothing submits from the editor: a form here would send a real lead.
          document.addEventListener(
            'submit',
            function (event) {
              if (editing) event.preventDefault();
            },
            true,
          );
          document.addEventListener(
            'blur',
            function () {
              send('idle');
            },
            true,
          );
          window.addEventListener('resize', refresh);
          window.addEventListener('message', onMessage);

          send('ready', inventory());
        }

        // Bound on `astro:page-load` as well as now — see README section 7.1.
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', setup, { once: true });
        } else {
          setup();
        }
      })();
}
