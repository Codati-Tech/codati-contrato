import { z } from 'zod';
/**
 * O manifesto: o site declarando os próprios blocos.
 *
 * É a camada 1 das três que a API usa para saber o que o painel pode editar —
 * manifesto do site, registry embutido, inferência pela forma do conteúdo. A
 * camada 1 existe do lado da API desde sempre e não era escrita por ninguém:
 * `Site.contentSchema` ficava nulo. Este arquivo é o que a preenche.
 *
 * O que ela compra: um bloco novo no repositório de um cliente vira campo novo
 * no painel sem deploy da API.
 *
 * O vocabulário **espelha** `FieldSpec`/`ListSpec`/`SectionSpec` do
 * `section-registry.ts` da API, campo por campo. Divergir criaria dois
 * formatos para a mesma ideia, e a camada 1 deixaria de conversar com a 2.
 */
/** Os controles que o painel sabe desenhar. Espelha `FieldType` da API. */
export const TIPOS_DE_CAMPO = [
    'text',
    'longtext',
    'markdown',
    'image',
    'url',
    'textList',
];
/**
 * As chaves que decidem como o bloco se comporta, nunca o que ele diz.
 *
 * O manifesto não pode declarar nenhuma delas como editável, e a API rejeita
 * se declarar. Deixar o cliente alcançar `variant` ou `id` é deixá-lo mudar o
 * comportamento da página achando que mudou uma palavra: `id` é o alvo de uma
 * âncora, `origin` é sob que rótulo os leads daquele formulário são arquivados.
 *
 * A lista é a mesma de `STRUCTURAL_KEYS` no `content-schema.ts` da API. As
 * duas precisam continuar iguais — o teste cobra isso.
 */
export const CHAVES_ESTRUTURAIS = [
    'type',
    'id',
    'icon',
    'featured',
    'origin',
    'layout',
    'slug',
    'anchor',
    'variant',
    'component',
];
const estrutural = new Set(CHAVES_ESTRUTURAIS);
/**
 * A chave de um campo, que pode ser aninhada: `cta.label`.
 *
 * Nenhum segmento pode ser chave estrutural. Barrar só a chave inteira deixaria
 * `cta.variant` passar, e `cta.variant` é tão estrutural quanto `variant`.
 */
const Chave = z
    .string()
    .min(1)
    .refine((k) => !k.split('.').some((parte) => estrutural.has(parte)), (k) => ({
    message: `"${k}" é chave estrutural. Ela decide como o bloco se comporta, não o ` +
        `que ele diz — deixá-la editável faz o cliente mudar comportamento ` +
        `achando que mudou texto. Estruturais: ${CHAVES_ESTRUTURAIS.join(', ')}.`,
}));
export const CampoSchema = z.object({
    key: Chave,
    label: z.string().min(1, 'todo campo precisa de rótulo'),
    type: z.enum(TIPOS_DE_CAMPO),
    help: z.string().optional(),
    maxLength: z.number().int().positive().optional(),
});
export const ListaSchema = z.lazy(() => z
    .object({
    key: Chave,
    label: z.string().min(1),
    /** O singular que o botão "adicionar" do painel usa. */
    itemLabel: z.string().min(1),
    fields: z.array(CampoSchema).min(1, 'lista sem campo não é editável'),
    /**
     * Se o cliente pode acrescentar ou remover entradas.
     *
     * Falso onde a contagem faz parte do desenho — uma faixa de três colunas
     * quebra com quatro. Nesses casos ele edita cada entrada e não muda a
     * quantidade.
     */
    resizable: z.boolean(),
    minItems: z.number().int().nonnegative().optional(),
    maxItems: z.number().int().positive().optional(),
    lists: z.array(ListaSchema).optional(),
})
    .refine((l) => l.minItems === undefined || l.maxItems === undefined || l.minItems <= l.maxItems, { message: 'minItems maior que maxItems: nenhuma quantidade satisfaz a lista' }));
export const SecaoSchema = z
    .object({
    label: z.string().min(1, 'toda seção precisa de rótulo'),
    fields: z.array(CampoSchema).default([]),
    lists: z.array(ListaSchema).default([]),
})
    .refine((s) => s.fields.length > 0 || s.lists.length > 0, {
    message: 'seção sem campo e sem lista não declara nada — o painel a mostraria vazia',
});
/**
 * Os controles de um formulário de lead. É a lista do contrato C4.
 *
 * É outra lista, e não a de `TIPOS_DE_CAMPO`, porque descreve outra coisa: o
 * que o visitante preenche, e não o que o cliente edita no painel. Um `select`
 * não é conteúdo, e uma `image` não é pergunta.
 */
export const TIPOS_DE_CAMPO_DE_FORMULARIO = [
    'text',
    'longtext',
    'email',
    'phone',
    'number',
    'date',
    'select',
    'checkbox',
];
/**
 * As chaves que viram coluna fixa do lead. As outras vão para `Lead.data`.
 */
export const CHAVES_FIXAS_DO_LEAD = ['name', 'email', 'phone', 'message'];
/**
 * A chave de um campo de formulário, como o C4 a define.
 *
 * Sem ponto e sem hífen porque ela vira chave de `Lead.data` e nome de coluna
 * do CSV: `aceite.whatsapp` seria lido como objeto aninhado de um lado e como
 * texto do outro.
 */
export const CHAVE_DE_CAMPO_DE_FORMULARIO = /^[a-z][a-z0-9_]{0,39}$/;
/**
 * O id de um formulário, que o site envia como `origin`.
 *
 * Mais estrito que o C4, que não diz nada: ele vai para um atributo HTML, para
 * a URL do filtro de Leads e para o nome do arquivo exportado. Um id com
 * espaço ou barra funcionaria em dois desses lugares e quebraria no terceiro.
 */
export const ID_DE_FORMULARIO = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const OpcaoSchema = z.object({
    value: z.string().min(1, 'opção sem valor não chega ao lead'),
    label: z.string().min(1, 'opção sem rótulo aparece vazia na lista'),
});
export const CampoDeFormularioSchema = z.object({
    key: z
        .string()
        .regex(CHAVE_DE_CAMPO_DE_FORMULARIO, 'a chave do campo usa letra minúscula, número e _, começando por letra (até 40)'),
    label: z.string().min(1, 'todo campo precisa de rótulo — ele vira a coluna em Leads'),
    type: z.enum(TIPOS_DE_CAMPO_DE_FORMULARIO),
    required: z.boolean().optional(),
    options: z.array(OpcaoSchema).optional(),
});
export const FormularioSchema = z
    .object({
    label: z.string().min(1, 'todo formulário precisa de rótulo — é o nome dele em Leads'),
    fields: z.array(CampoDeFormularioSchema).min(1, 'formulário sem campo não pergunta nada'),
})
    .superRefine((form, ctx) => {
    const vistas = new Set();
    form.fields.forEach((campo, i) => {
        // Duas perguntas com a mesma chave: a segunda resposta apaga a primeira
        // no lead, e o visitante respondeu as duas.
        if (vistas.has(campo.key)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['fields', i, 'key'],
                message: `"${campo.key}" aparece duas vezes no formulário`,
            });
        }
        vistas.add(campo.key);
        if (campo.type === 'select') {
            const valores = (campo.options ?? []).map((o) => o.value);
            if (valores.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['fields', i, 'options'],
                    message: `"${campo.key}" é select e não tem opção nenhuma`,
                });
            }
            else if (new Set(valores).size !== valores.length) {
                // Duas opções com o mesmo valor chegam ao painel iguais, e o
                // cliente não sabe qual o visitante escolheu.
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['fields', i, 'options'],
                    message: `"${campo.key}" tem duas opções com o mesmo valor`,
                });
            }
        }
    });
    // O amortecedor recusa lead sem contato. Um formulário que não pergunta
    // nenhum dos dois parece funcionar e nunca entrega nada.
    if (!vistas.has('email') && !vistas.has('phone')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['fields'],
            message: 'formulário sem "email" nem "phone": o lead chega sem contato e é recusado',
        });
    }
});
/**
 * As páginas que o painel edita, por idioma.
 *
 * Sem esta chave o site é estático para o painel. Com ela, a api lê cada
 * `inputs/content/<idioma>/pages/<página>.md` e semeia o conteúdo (C6).
 */
export const PaginasSchema = z.record(z.string().regex(/^[a-z]{2}(-[a-z]{2})?$/i, 'idioma no formato pt-br'), z
    .array(z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'nome de página em letra minúscula, número e hífen'))
    .min(1, 'idioma sem página nenhuma')
    .refine((l) => new Set(l).size === l.length, 'página repetida no mesmo idioma'));
export const ManifestoSchema = z.object({
    version: z.literal(1),
    pages: PaginasSchema.optional(),
    sections: z.record(z.string(), SecaoSchema),
    forms: z
        .record(z.string().regex(ID_DE_FORMULARIO, 'id de formulário em letra minúscula, número e hífen (até 40)'), FormularioSchema)
        .optional(),
});
/**
 * Lê e valida o manifesto do repositório.
 *
 * Falha alto, no build. Um manifesto inválido publicado é pior que build
 * quebrado: a API cai para a camada 2, o painel mostra os campos do template
 * padrão, e o cliente edita um campo que este site não renderiza. A edição é
 * aceita, descartada e reportada como salva — o modo de falha é o silêncio, e
 * ele já aconteceu nesta plataforma.
 */
export function carregarManifesto(bruto) {
    const parsed = ManifestoSchema.safeParse(bruto);
    if (!parsed.success) {
        throw new Error('codati.manifest.json inválido: ' +
            parsed.error.issues
                .map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`)
                .join('; '));
    }
    return parsed.data;
}
/**
 * Todo caminho editável que o manifesto declara, achatado.
 *
 * `hero.headline`, `services.items[].title`. É a forma que dá para comparar
 * com o que as variantes de fato marcam com `data-codati-path`.
 */
export function caminhosDeclarados(manifesto) {
    const out = [];
    for (const [tipo, secao] of Object.entries(manifesto.sections)) {
        for (const campo of secao.fields)
            out.push(`${tipo}.${campo.key}`);
        for (const lista of secao.lists ?? [])
            achatarLista(out, `${tipo}.${lista.key}`, lista);
    }
    return out.sort();
}
function achatarLista(out, prefixo, lista) {
    for (const campo of lista.fields)
        out.push(`${prefixo}[].${campo.key}`);
    for (const dentro of lista.lists ?? []) {
        achatarLista(out, `${prefixo}[].${dentro.key}`, dentro);
    }
}
