import type { CampoDeFormulario, Formulario, Manifesto } from './manifest.ts';
import { separarContato } from './leads.ts';

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
export const CAMPO_CONTATO = '_contato';

/** O campo que só robô preenche. */
export const CAMPO_ARMADILHA = '_gotcha';

/** A origem que um bloco de formulário usa quando não diz qual é a sua. */
export const ORIGEM_PADRAO = 'contato';

/** Um controle, na ordem em que aparece na tela. */
export type ControleDoFormulario =
  | { tipo: 'campo'; campo: CampoDeFormulario }
  | { tipo: 'contato'; name: typeof CAMPO_CONTATO; label: string };

/**
 * O formulário que um bloco aponta, ou um erro que diz o que falta.
 *
 * Falha no build, e de propósito. Um bloco apontando para uma origem que o
 * manifesto não declara renderizaria um formulário que manda lead para uma
 * origem sem colunas: o lead chega, o painel não sabe o que mostrar, e a
 * resposta do visitante vira um JSON que ninguém lê. Ninguém olha o build
 * esperando isso; olha quando ele quebra.
 */
export function formularioDaOrigem(
  manifesto: Pick<Manifesto, 'forms'>,
  origem: string | undefined,
): { origem: string; formulario: Formulario } {
  const id = origem && origem.trim() !== '' ? origem.trim() : ORIGEM_PADRAO;
  const formulario = manifesto.forms?.[id];

  if (!formulario) {
    const declarados = Object.keys(manifesto.forms ?? {});
    throw new Error(
      `O bloco de formulário aponta para "${id}", que o codati.manifest.json não declara em "forms". ` +
        (declarados.length > 0
          ? `Declarados: ${declarados.join(', ')}.`
          : 'O manifesto não declara formulário nenhum.'),
    );
  }

  return { origem: id, formulario };
}

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
export function controlesDoFormulario(formulario: Formulario): ControleDoFormulario[] {
  const email = formulario.fields.find((c) => c.key === 'email');
  const phone = formulario.fields.find((c) => c.key === 'phone');
  const juntar = Boolean(email && phone && !email.required && !phone.required);

  const controles: ControleDoFormulario[] = [];

  for (const campo of formulario.fields) {
    if (juntar && (campo.key === 'email' || campo.key === 'phone')) {
      if (!controles.some((c) => c.tipo === 'contato')) {
        controles.push({
          tipo: 'contato',
          name: CAMPO_CONTATO,
          label: `${phone!.label} ou ${email!.label}`,
        });
      }
      continue;
    }

    controles.push({ tipo: 'campo', campo });
  }

  return controles;
}

/** Um controle do formulário como o navegador o entrega: nome, tipo e valor. */
export interface EntradaDoFormulario {
  name: string;
  /** O `type` do input, ou `select`/`textarea`. */
  type: string;
  value: string;
  checked?: boolean;
}

/** O que o script decide depois de ler o formulário. */
export type Envio =
  | { acao: 'enviar'; corpo: Record<string, unknown> }
  /** Robô: a tela diz que recebeu e nada sai. */
  | { acao: 'fingir' }
  | { acao: 'recusar'; motivo: string };

/** O texto quando falta contato. Neutro, e diz o que fazer. */
export const SEM_CONTATO =
  'Deixe um WhatsApp com DDD ou um e-mail para a gente responder.';

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
export function montarEnvio(
  entradas: EntradaDoFormulario[],
  siteSlug: string,
  origem: string,
  pagina: string,
): Envio {
  // `some`, e não `find`: um robô que acha dois campos com o nome preenche o
  // segundo, e olhar só o primeiro deixaria o envio passar.
  if (entradas.some((e) => e.name === CAMPO_ARMADILHA && e.value.trim() !== '')) {
    return { acao: 'fingir' };
  }

  const raiz: Record<string, string> = {};
  const data: Record<string, unknown> = {};

  for (const entrada of entradas) {
    const { name, type } = entrada;

    if (name === CAMPO_CONTATO) {
      Object.assign(raiz, separarContato(entrada.value));
      continue;
    }

    // `_` é do site: a armadilha, e o que mais o site precisar sem virar
    // coluna do lead.
    if (name === '' || name.startsWith('_')) continue;

    if (type === 'checkbox') {
      data[name] = Boolean(entrada.checked);
      continue;
    }

    const valor = entrada.value.trim();
    if (valor === '') continue;

    // E-mail e telefone em campos separados passam pela mesma régua do campo
    // único: um telefone de seis dígitos não é contato, e mandá-lo faria o
    // amortecedor aceitar um lead que ninguém consegue retornar.
    if (name === 'email' || name === 'phone') {
      const contato = separarContato(name === 'phone' ? valor.replace(/@/g, '') : valor);
      if (contato[name]) raiz[name] = contato[name]!;
      continue;
    }

    if (name === 'name' || name === 'message') {
      raiz[name] = valor;
      continue;
    }

    if (type === 'number') {
      const numero = Number(valor.replace(',', '.'));
      if (Number.isFinite(numero)) data[name] = numero;
      continue;
    }

    data[name] = valor;
  }

  if (!raiz.email && !raiz.phone) return { acao: 'recusar', motivo: SEM_CONTATO };

  data._pagina = pagina;

  return {
    acao: 'enviar',
    corpo: { site_slug: siteSlug, origin: origem, ...raiz, data },
  };
}
