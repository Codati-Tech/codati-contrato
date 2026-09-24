import type { CampoDeFormulario, Formulario, Manifesto } from './manifest.ts';
/**
 * O formulário de lead, desenhado a partir do que o manifesto declara.
 *
 * Antes os campos eram fixos no componente e o `origin` era o caminho da
 * página. Isso servia a um formulário só: o de orçamento com um `select` não
 * tinha onde declarar as opções, e o painel não tinha como saber que coluna
 * mostrar. Agora o manifesto declara, o site desenha o que foi declarado, e o
 * painel lê a mesma declaração (contrato C4).
 *
 * Tudo aqui é função pura, para o teste alcançar sem montar o Astro. O
 * componente e o script do navegador só ligam isto ao DOM.
 */
/** O nome do campo único de contato. `_` porque não é uma chave do manifesto. */
export declare const CAMPO_CONTATO = "_contato";
/** O campo que só robô preenche. */
export declare const CAMPO_ARMADILHA = "_gotcha";
/** A origem que um bloco de formulário usa quando não diz qual é a sua. */
export declare const ORIGEM_PADRAO = "contato";
/** Um controle, na ordem em que aparece na tela. */
export type ControleDoFormulario = {
    tipo: 'campo';
    campo: CampoDeFormulario;
} | {
    tipo: 'contato';
    name: typeof CAMPO_CONTATO;
    label: string;
};
/**
 * O formulário que um bloco aponta, ou um erro que diz o que falta.
 *
 * Falha no build, e de propósito. Um bloco apontando para uma origem que o
 * manifesto não declara renderizaria um formulário que manda lead para uma
 * origem sem colunas: o lead chega, o painel não sabe o que mostrar, e a
 * resposta do visitante vira um JSON que ninguém lê. Ninguém olha o build
 * esperando isso; olha quando ele quebra.
 */
export declare function formularioDaOrigem(manifesto: Pick<Manifesto, 'forms'>, origem: string | undefined): {
    origem: string;
    formulario: Formulario;
};
/**
 * Os controles na ordem da tela, com o contato juntado quando a regra pede.
 *
 * Decidido pelo usuário em 2026-09-13: formulário que declara `email` e
 * `phone`, os dois opcionais, pergunta os dois numa linha só — "WhatsApp ou
 * e-mail". Dois campos de contato derrubam a conversão, e quem tem padaria não
 * quer preencher os dois. Se um dos dois é obrigatório, a pergunta é outra, e
 * os dois aparecem.
 *
 * A linha única entra onde o primeiro dos dois estava, para a ordem que quem
 * escreveu o manifesto escolheu continuar valendo.
 */
export declare function controlesDoFormulario(formulario: Formulario): ControleDoFormulario[];
/** Um controle do formulário como o navegador o entrega: nome, tipo e valor. */
export interface EntradaDoFormulario {
    name: string;
    /** O `type` do input, ou `select`/`textarea`. */
    type: string;
    value: string;
    checked?: boolean;
}
/** O que o script decide depois de ler o formulário. */
export type Envio = {
    acao: 'enviar';
    corpo: Record<string, unknown>;
}
/** Robô: a tela diz que recebeu e nada sai. */
 | {
    acao: 'fingir';
} | {
    acao: 'recusar';
    motivo: string;
};
/** O texto quando falta contato. Neutro, e diz o que fazer. */
export declare const SEM_CONTATO = "Deixe um WhatsApp com DDD ou um e-mail para a gente responder.";
/**
 * O corpo que o amortecedor recebe, a partir do formulário preenchido.
 *
 * Três conversões que o `FormData` não faz, e as três chegariam erradas ao
 * painel sem aviso nenhum:
 *
 * - **`checkbox` desmarcado não aparece no `FormData`.** O lead chegaria sem a
 *   chave, e "não aceitou" ficaria igual a "formulário antigo, sem a pergunta".
 *   Vai `false`, sempre.
 * - **`number` vem como texto.** Vai número, para o painel ordenar e o CSV
 *   somar; o que não é número não vai.
 * - **O contato único vira `email` ou `phone`.** Quem separa é o site, não o
 *   visitante.
 *
 * `origin` é o id do formulário, e não o caminho da página — o caminho vai em
 * `data._pagina`. Com o caminho em `origin`, dois formulários na mesma página
 * viravam uma origem só, e o mesmo formulário em duas páginas, duas.
 */
export declare function montarEnvio(entradas: EntradaDoFormulario[], siteSlug: string, origem: string, pagina: string): Envio;
