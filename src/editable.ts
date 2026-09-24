/**
 * Marks a rendered node as the thing that draws one piece of content.
 *
 * The Codati panel edits a site by embedding it and letting the client type on
 * top of the real page. For that to work the panel has to know which DOM node
 * corresponds to which value in the content — and it must know it *without*
 * knowing anything about this template's layout, because layout is exactly what
 * differs from client to client. These attributes are that contract, and they
 * are the whole of it: a template that annotates its nodes is editable, and one
 * that does not simply previews read-only.
 *
 * Paths address the page content the same way the API does, so what the panel
 * reads back off the DOM can be written straight into the draft:
 *
 *     title                      the page title
 *     sections.0.headline        a field on the first section
 *     sections.3.items.2.title   a field on an entry in a list
 *
 * The attributes ship in every build, not only in preview. They cost a few
 * bytes, they are inert without the editor attached, and keeping one code path
 * means the page a client edits is byte-for-byte the page a visitor gets.
 */

/**
 * Which version of this contract the site speaks.
 *
 * The attributes below are a language, and a language that changes leaves
 * every site built before the change speaking the old one. Without a number on
 * the page the panel cannot tell which it is talking to: it would draw the
 * field, the client would type, and the write would go to a path that no
 * longer exists — accepted, dropped, reported as saved.
 *
 * Bump it when an attribute changes meaning or disappears, not when one is
 * added: a panel that knows version N copes with a page that marks less than N
 * allows, and that is how `data-codati-link` and `data-codati-list` arrived
 * without breaking anything.
 *
 * A constant in code, never an environment variable. The build only embeds
 * what is prefixed `PUBLIC_`, and anything else reaches the Worker as
 * `undefined` without a word — a site that quietly stops declaring is worse
 * than one that never declared, because absence is read as "version 1".
 *
 * Not `codati.manifest.json`'s `version`: that one numbers the manifest's
 * format, and the two change for different reasons and at different times.
 *
 * Version 2 (unit 1403, 2026-09-22): the bridge applies a list action
 * (`list-apply`) to the page itself, rewriting every index in the entries'
 * paths and the number drawn in `data-codati-index`, instead of the panel
 * reloading the preview. A version 1 page keeps reloading.
 */
export const CONTRACT_VERSION = 2;

/**
 * The attribute that carries it, on `<html>`.
 *
 * On the root element because it has to survive any layout: the panel reads it
 * off `document.documentElement` without walking the tree, and the published
 * page carries it exactly as the preview does, which is what lets the platform
 * check a site that is already in the air.
 */
export const CONTRACT_ATTRIBUTE = 'data-codati-contract';

/** What `<html>` spreads, so the attribute's name is written in one place. */
export function contractAttributes(): Record<string, string> {
    return { [CONTRACT_ATTRIBUTE]: String(CONTRACT_VERSION) };
}

/** How a value is edited, when the panel cannot infer it from the node. */
export type EditableKind = 'text' | 'richtext' | 'image' | 'url';

export interface EditableAttributes {
    'data-codati-path'?: string;
    'data-codati-kind'?: EditableKind;
}

/**
 * Attributes for the node that renders `key` within `basePath`.
 *
 * Returns nothing when there is no base path, so a component rendered outside a
 * content-driven page — a 404, a blog post — stays unannotated rather than
 * claiming a path that does not exist.
 */
export function editable(
    basePath: string | undefined,
    key?: string,
    kind: EditableKind = 'text',
): EditableAttributes {
    if (!basePath) return {};

    const path = key ? `${basePath}.${key}` : basePath;
    return { 'data-codati-path': path, 'data-codati-kind': kind };
}

/**
 * The path of an entry inside a list field, e.g. `sections.2.items.0`.
 *
 * Kept here rather than spelled out at each call site because the panel parses
 * these paths back into indices; one place to change if that ever moves.
 */
export function itemPath(
    basePath: string | undefined,
    listKey: string,
    index: number,
): string | undefined {
    return basePath ? `${basePath}.${listKey}.${index}` : undefined;
}

/** Marks the element that draws a whole section, so the panel can outline it. */
export function editableSection(
    basePath: string | undefined,
    type: string,
): Record<string, string> {
    if (!basePath) return {};
    return { 'data-codati-section': basePath, 'data-codati-section-type': type };
}

/* ─── The interactive editor (2026-09-14) ───────────────────────────────────
 *
 * The panel edits everything on the page itself: a button's destination on the
 * button, a photo on the photo, a list's entries on the list. These attributes
 * are what it reads for that, and like the ones above they are inert outside
 * the preview. The full recipe lives in
 * `specs/11-sprint-final/CONTRATO-DO-SITE.md`, "O editor visual".
 */

/**
 * Marks the element that leads somewhere (`<a>`) with the path of its
 * destination field. The label keeps its own `editable(path, 'cta.label')`; the
 * destination rides on the same element, and the panel edits it in a bubble
 * over it.
 */
export function editableLink(
    basePath: string | undefined,
    key: string,
): Record<string, string> {
    if (!basePath) return {};
    return { 'data-codati-link': `${basePath}.${key}` };
}

/** Marks the element that holds a list's entries, so the panel can add one to it. */
export function editableList(
    basePath: string | undefined,
    listKey: string,
): Record<string, string> {
    if (!basePath) return {};
    return { 'data-codati-list': `${basePath}.${listKey}` };
}

/** Marks one entry of a list, so the panel can move, duplicate and remove it. */
export function editableItem(
    basePath: string | undefined,
    listKey: string,
    index: number,
): Record<string, string> {
    const path = itemPath(basePath, listKey, index);
    return path ? { 'data-codati-item': path } : {};
}

/** Whether the page is being rendered for the editor (the preview route sets it). */
export function isPreview(locals: unknown): boolean {
    return Boolean(locals && (locals as { codatiPreview?: unknown }).codatiPreview === true);
}

/**
 * Whether a component renders its empty fields, as spots to click and type into.
 *
 * Only in the preview, and only for a component with a path: an empty eyebrow
 * on the published site still renders nothing, and so does one in the menu,
 * which has no path because nothing there is the client's to write. Without
 * this an empty field did not exist on the page, and the panel listed it in a
 * side list nobody understood (2026-09-14).
 */
export function showEmpty(locals: unknown, basePath: string | undefined): boolean {
    return Boolean(basePath) && isPreview(locals);
}

/**
 * What the preview shows in place of a photo that does not exist yet.
 *
 * Wide and short on purpose: an optional photo nobody wants should not take a
 * screen of preview, and the `<img>` keeps the published classes, so picking a
 * real photo lands in exactly the box the visitor will see. The words are few
 * and centred because `object-fit: cover` crops the sides in a taller box.
 */
export const EMPTY_IMAGE =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">' +
            '<rect width="800" height="300" fill="#e7ecec"/>' +
            '<text x="400" y="150" font-family="system-ui,sans-serif" font-size="28" fill="#6b7677" text-anchor="middle">' +
            'Escolher foto</text>' +
            // Quem olha a prévia não tem como saber que este espaço não existe
            // no site publicado. O usuário leu isso como "o editor mostra uma
            // coisa e meu site é outra" (2026-09-21) — e a leitura estava certa.
            '<text x="400" y="186" font-family="system-ui,sans-serif" font-size="17" fill="#8b9596" text-anchor="middle">' +
            'só você vê este espaço; o visitante não</text></svg>',
    );

/**
 * Marca um campo do **site**, e não da página.
 *
 * O rodapé desenha os dados da empresa — nome, CNPJ, endereço, telefone,
 * e-mail, redes. Eles não pertencem a nenhuma página: moram uma vez só, no
 * conteúdo global do site (`locale='*'` na api, `GET/PUT /content/company`),
 * e aparecem em todas.
 *
 * Por isso não dá para usar `editable()` aqui. Ele endereça o conteúdo da
 * página (`sections.0.headline`), e o rodapé é montado pelo `BaseLayout` sem
 * página nenhuma: `path` chega `undefined` e `editable()` devolve `{}`. O
 * resultado é o que esteve no ar desde sempre — **o rodapé sai sem nenhuma
 * anotação**, e a única forma de mexer nele é um formulário de doze campos
 * no painel, com campo de LinkedIn em site que não tem LinkedIn.
 *
 * O prefixo `company.` é o que diz ao painel onde escrever. Ele já é um
 * caminho válido pelo contrato (`caminhoDeEdicaoValido` na api aceita
 * `company.name`), então nenhum site existente passa a mentir sobre si mesmo
 * e a versão do contrato **não sobe**: isto acrescenta um endereço, não muda
 * o significado de nenhum.
 *
 * Um site antigo, sem estas marcas, continua editável pelo formulário — e o
 * painel simplesmente não acha nada para destacar no rodapé dele.
 */
export function global(campo: string, kind: EditableKind = 'text'): EditableAttributes {
    return editable('company', campo, kind);
}

/**
 * The site-wide field that a link's destination comes from.
 *
 * The pair of `global`, for the case where the field is not what the node
 * shows. The footer's WhatsApp link displays the word "WhatsApp" and its
 * `href` derives from the phone: annotating it as text meant editing the
 * label saved "WhatsApp" into the phone number, and the link then pointed at
 * whatever the client typed.
 *
 * With this the panel edits the destination and the label stays what the
 * variant drew — a word, a button or an icon. It is what makes a phone
 * reachable in a variant that never prints it.
 */
export function globalLink(campo: string): Record<string, string> {
    return editableLink('company', campo);
}
