import { type Manifesto } from './manifest.ts';
/**
 * O que `npm run verificar:contrato` confere num site integrado.
 *
 * O contrato do site (`specs/11-sprint-final/CONTRATO-DO-SITE.md`) tem uma
 * parte que só gente confere — a prévia abrir no painel, o lead chegar — e uma
 * parte que código confere. Esta é a segunda, e ela existe porque todas as
 * quebras dela são mudas: o site constrói, abre, parece certo, e o painel não
 * edita, ou o lead chega sem coluna, ou o Google indexa o endereço de outro.
 *
 * Funções puras sobre texto, para o teste alcançar sem build. Quem lê o disco
 * é `scripts/verificar-contrato.mjs`.
 *
 * Os imports levam `.ts` porque o script roda no Node sem compilar: a
 * validação do manifesto é **a mesma** que o build usa, e não uma cópia que
 * divergiria na primeira mudança.
 */
/** Uma falha, dita para quem vai consertar. */
export interface Falha {
    onde: string;
    problema: string;
}
/** O ambiente que importa: o que a esteira injeta no build. */
export interface Ambiente {
    SITE_DOMAIN?: string;
    PUBLIC_LEADS_URL?: string;
    EDGE_SECRET?: string;
}
/**
 * O formato do caminho que o painel monta (`editablePaths` no webapp).
 *
 * Dois formatos: o campo de um bloco (`sections.0.headline`) e o campo da
 * própria página (`title`, `body`, `intro.headline`, `services.2.title`), que
 * é onde mora o texto de uma página de texto corrido. O que reprova é o que
 * nunca casa com campo nenhum: a página na frente (`home.sections.0.headline`),
 * um `undefined` que vazou de um caminho montado sem base, e o bloco sem campo.
 */
export declare const CAMINHO_DE_EDICAO: RegExp;
/** O manifesto, validado pelo mesmo Zod do build, e o que falta para ser integrado. */
export declare function conferirManifesto(bruto: unknown): {
    manifesto: Manifesto | null;
    falhas: Falha[];
};
/**
 * Cada página declarada tem o arquivo que a api lê como semente, e cada bloco
 * dela é de um tipo que o manifesto descreve.
 *
 * Página sem arquivo nasce vazia no painel. Bloco de tipo não declarado é
 * desenhado pelo site e não aparece para edição — o cliente vê o texto no ar
 * e não acha onde mudá-lo.
 */
export declare function conferirPaginas(manifesto: Manifesto, ler: (caminho: string) => string | null): Falha[];
/** Tudo que o contrato cobra de uma página HTML do `dist/`. */
export declare function conferirHtml(arquivo: string, html: string, manifesto: Manifesto, ambiente: Ambiente): Falha[];
/** O que o contrato cobra do `dist/` inteiro, não de uma página. */
export declare function conferirDist(arquivos: Map<string, string>, ambiente: Ambiente): Falha[];
