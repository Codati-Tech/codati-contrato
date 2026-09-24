/**
 * Para onde o formulário do site manda o lead.
 *
 * O destino é o **amortecedor de leads** (`codati-edge`), não a API: ele
 * guarda o lead mesmo com a API fora do ar e reentrega depois. Um formulário
 * que fala direto com a API perde o lead exatamente no momento em que perder
 * um lead é mais caro — quando alguma coisa está quebrada.
 *
 * As variáveis chegam por parâmetro, e não por `import.meta.env`: este código
 * mora num pacote, e o Vite só substitui `import.meta.env` no código que ele
 * transforma — dentro de `node_modules`, na build do servidor, o valor chega
 * indefinido. Quem chama passa o ambiente em camadas, o do Worker por cima do
 * da build: `destinoDoLead({ ...import.meta.env, ...Astro.locals.runtime?.env })`.
 *
 * Só `PUBLIC_*` chega ao navegador e ao Worker. Uma variável sem o prefixo é
 * `undefined` lá, **em silêncio** — e no caso do formulário isso não quebra
 * nada visível: o site continua bonito e todo lead vai para o lixo.
 */

export interface DestinoDoLead {
  url: string | null;
  siteSlug: string | null;
}

export function destinoDoLead(
  env?: Record<string, unknown>,
): DestinoDoLead {
  return {
    url: naoVazio(env?.PUBLIC_LEADS_URL) ?? null,
    siteSlug: naoVazio(env?.PUBLIC_SITE_SLUG) ?? null,
  };
}

/**
 * O corpo que o amortecedor espera.
 *
 * Ele exige `site_slug` e **pelo menos um contato** — sem e-mail nem telefone
 * o lead não serve para nada, e guardá-lo seria encher a caixa de entrada de
 * quem tem padaria com envio vazio de robô.
 *
 * Os campos que o formulário do cliente tiver a mais vão em `data`, inteiros:
 * um site pode perguntar o que quiser, e a resposta chega junto.
 */
export function corpoDoLead(
  campos: Record<string, string>,
  siteSlug: string,
  origem: string,
): Record<string, unknown> {
  const { name, email, phone, message, ...resto } = campos;

  return {
    site_slug: siteSlug,
    origin: origem,
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(message ? { message } : {}),
    ...(Object.keys(resto).length > 0 ? { data: resto } : {}),
  };
}

/**
 * O campo único de contato, separado em e-mail e telefone.
 *
 * O formulário pergunta "WhatsApp ou e-mail" numa linha só de propósito: dois
 * campos obrigatórios num formulário de contato derrubam a conversão, e quem
 * tem padaria não quer preencher os dois. Quem separa é o site, não o cliente.
 *
 * Sem `@` é telefone — inclusive quando vem com parênteses, traço e espaço,
 * que é como as pessoas de fato digitam.
 */
export function separarContato(valor: string): {
  email?: string;
  phone?: string;
} {
  const limpo = valor.trim();
  if (limpo === '') return {};

  if (limpo.includes('@')) return { email: limpo };

  const digitos = limpo.replace(/\D/g, '');

  // Menos que isso não é telefone brasileiro, e mandar assim faria o
  // amortecedor guardar um lead que ninguém consegue retornar.
  return digitos.length >= 10 ? { phone: digitos } : {};
}

/** Se dá para mandar: sem contato, o amortecedor recusa de qualquer jeito. */
export function temContato(campos: Record<string, string>): boolean {
  return Boolean(campos.email?.trim() || campos.phone?.trim());
}

function naoVazio(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}
