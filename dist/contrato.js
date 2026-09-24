import matter from 'gray-matter';
import { ManifestoSchema } from "./manifest.js";
import { controlesDoFormulario } from "./formulario.js";
/**
 * O formato do caminho que o painel monta (`editablePaths` no webapp).
 *
 * Dois formatos: o campo de um bloco (`sections.0.headline`) e o campo da
 * própria página (`title`, `body`, `intro.headline`, `services.2.title`), que
 * é onde mora o texto de uma página de texto corrido. O que reprova é o que
 * nunca casa com campo nenhum: a página na frente (`home.sections.0.headline`),
 * um `undefined` que vazou de um caminho montado sem base, e o bloco sem campo.
 */
export const CAMINHO_DE_EDICAO = /^(?!(?:.*\.)?(?:undefined|null)(?:\.|$))(?:sections\.\d+(?:\.[A-Za-z0-9_-]+)+|(?!sections(?:\.|$))[A-Za-z][A-Za-z0-9_-]*(?:\.(?!sections(?:\.|$))[A-Za-z0-9_-]+)*)$/;
/** O manifesto, validado pelo mesmo Zod do build, e o que falta para ser integrado. */
export function conferirManifesto(bruto) {
    const parsed = ManifestoSchema.safeParse(bruto);
    if (!parsed.success) {
        return {
            manifesto: null,
            falhas: parsed.error.issues.map((i) => ({
                onde: `codati.manifest.json › ${i.path.join('.') || '(raiz)'}`,
                problema: i.message,
            })),
        };
    }
    const falhas = [];
    // Sem `pages` o manifesto é válido — e o site é estático para o painel. Este
    // verificador é para site integrado, e aí a ausência é o defeito inteiro:
    // o painel diria ao cliente que nada é editável.
    if (!parsed.data.pages || Object.keys(parsed.data.pages).length === 0) {
        falhas.push({
            onde: 'codati.manifest.json › pages',
            problema: 'o manifesto não declara páginas. Sem "pages" o painel trata o site como estático e nada é editável.',
        });
    }
    return { manifesto: parsed.data, falhas };
}
/**
 * Cada página declarada tem o arquivo que a api lê como semente, e cada bloco
 * dela é de um tipo que o manifesto descreve.
 *
 * Página sem arquivo nasce vazia no painel. Bloco de tipo não declarado é
 * desenhado pelo site e não aparece para edição — o cliente vê o texto no ar
 * e não acha onde mudá-lo.
 */
export function conferirPaginas(manifesto, ler) {
    const falhas = [];
    for (const [idioma, paginas] of Object.entries(manifesto.pages ?? {})) {
        for (const pagina of paginas) {
            const caminho = `inputs/content/${idioma}/pages/${pagina}.md`;
            const fonte = ler(caminho);
            if (fonte === null) {
                falhas.push({ onde: caminho, problema: `a página "${pagina}" está em "pages" e o arquivo não existe` });
                continue;
            }
            let dados;
            try {
                dados = matter(fonte).data;
            }
            catch (erro) {
                falhas.push({ onde: caminho, problema: `o frontmatter não é YAML válido: ${erro.message}` });
                continue;
            }
            if (typeof dados.title !== 'string' || dados.title.trim() === '') {
                falhas.push({ onde: caminho, problema: 'falta "title" no frontmatter' });
            }
            const secoes = Array.isArray(dados.sections) ? dados.sections : [];
            secoes.forEach((secao, i) => {
                const tipo = secao?.type;
                if (typeof tipo !== 'string' || !manifesto.sections[tipo]) {
                    falhas.push({
                        onde: `${caminho} › sections.${i}`,
                        problema: `o bloco de tipo "${String(tipo)}" não está em "sections" do manifesto; o painel não oferece edição para ele`,
                    });
                }
            });
        }
    }
    return falhas;
}
/** Os atributos de uma tag de abertura. */
function atributos(tag) {
    const out = {};
    for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
    }
    return out;
}
/** Os nomes que um formulário declarado precisa ter no HTML. */
function nomesEsperados(manifesto, origem) {
    const formulario = manifesto.forms?.[origem];
    if (!formulario)
        return null;
    return controlesDoFormulario(formulario).map((c) => (c.tipo === 'contato' ? c.name : c.campo.key));
}
/** Tudo que o contrato cobra de uma página HTML do `dist/`. */
export function conferirHtml(arquivo, html, manifesto, ambiente) {
    const falhas = [];
    for (const m of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
        const attrs = atributos(m[1]);
        if (!('data-codati-form' in attrs))
            continue;
        const origem = attrs['data-codati-form'];
        const onde = `${arquivo} › formulário "${origem}"`;
        if (origem === '') {
            falhas.push({ onde, problema: 'data-codati-form sem valor: o lead não diz de que formulário veio' });
            continue;
        }
        const esperados = nomesEsperados(manifesto, origem);
        if (!esperados) {
            falhas.push({
                onde,
                problema: `"${origem}" não está em "forms" do manifesto; os leads dele chegam ao painel sem coluna nenhuma`,
            });
            continue;
        }
        const nomes = new Set([...m[2].matchAll(/<(?:input|select|textarea)\b([^>]*)>/gi)]
            .map((c) => atributos(c[1]).name)
            .filter((n) => Boolean(n)));
        for (const nome of nomes) {
            if (nome.startsWith('_') && nome !== '_contato')
                continue;
            if (!esperados.includes(nome)) {
                falhas.push({
                    onde,
                    problema: `o campo "${nome}" não está declarado neste formulário; a resposta chega sem coluna no painel`,
                });
            }
        }
        for (const esperado of esperados) {
            if (!nomes.has(esperado)) {
                falhas.push({
                    onde,
                    problema: `o manifesto declara "${esperado}" e o formulário não tem esse campo; a coluna fica vazia para sempre`,
                });
            }
        }
        // Com o destino da esteira no ambiente, o `action` tem de ser ele. Sem
        // ele (build local, CI do repositório), não há contra o que comparar.
        const destino = (ambiente.PUBLIC_LEADS_URL ?? '').trim();
        if (destino && attrs.action !== destino) {
            falhas.push({
                onde,
                problema: `o action é "${attrs.action ?? ''}" e o amortecedor é "${destino}"; o lead não chega`,
            });
        }
    }
    for (const m of html.matchAll(/data-codati-(path|link|list|item)="([^"]*)"/g)) {
        if (!CAMINHO_DE_EDICAO.test(m[2])) {
            falhas.push({
                onde: `${arquivo} › ${m[2]}`,
                problema: m[1] === 'path'
                    ? 'caminho de edição fora do formato "sections.<índice>.<campo>"; o painel não casa o clique com campo nenhum'
                    : `data-codati-${m[1]} fora do formato "sections.<índice>.<campo>"; o painel não acha o campo que ele aponta`,
            });
        }
    }
    const canonical = /<link\b[^>]*rel="canonical"[^>]*>/i.exec(html);
    if (!canonical) {
        falhas.push({ onde: arquivo, problema: 'falta <link rel="canonical">' });
    }
    else {
        const href = atributos(canonical[0]).href ?? '';
        const dominio = hostDe(ambiente.SITE_DOMAIN);
        if (dominio && hostDe(href) !== dominio) {
            falhas.push({
                onde: arquivo,
                problema: `o canonical aponta para "${href}" e o site é "${dominio}"; o Google indexa este site com o endereço de outro`,
            });
        }
    }
    return falhas;
}
/** O host de um endereço, aceitando host puro ou URL. */
function hostDe(valor) {
    const limpo = (valor ?? '').trim();
    if (limpo === '')
        return '';
    try {
        return new URL(limpo.includes('://') ? limpo : `https://${limpo}`).host.toLowerCase();
    }
    catch {
        return limpo.toLowerCase();
    }
}
/** O que o contrato cobra do `dist/` inteiro, não de uma página. */
export function conferirDist(arquivos, ambiente) {
    const falhas = [];
    if (!arquivos.has('index.html')) {
        falhas.push({ onde: 'dist/', problema: 'falta index.html: o endereço do site responde sem página' });
    }
    if (!arquivos.has('sitemap-index.xml') && !arquivos.has('sitemap.xml')) {
        falhas.push({ onde: 'dist/', problema: 'falta o sitemap (sitemap-index.xml ou sitemap.xml)' });
    }
    /**
     * O segredo entre a api e o amortecedor está no ambiente de todo build,
     * porque a esteira injeta o mesmo conjunto em todo site. Se ele cair num
     * arquivo publicado, qualquer visitante manda lead em nome de qualquer site.
     *
     * Procura o **valor**, que é o que vaza. Curto demais para procurar sem
     * falso positivo não é segredo, e aí não há o que proteger.
     */
    const segredo = (ambiente.EDGE_SECRET ?? '').trim();
    if (segredo.length >= 8) {
        for (const [nome, conteudo] of arquivos) {
            if (conteudo.includes(segredo)) {
                falhas.push({ onde: `dist/${nome}`, problema: 'o valor de EDGE_SECRET está publicado neste arquivo' });
            }
        }
    }
    return falhas;
}
