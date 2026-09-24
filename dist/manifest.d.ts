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
export declare const TIPOS_DE_CAMPO: readonly ["text", "longtext", "markdown", "image", "url", "textList"];
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
export declare const CHAVES_ESTRUTURAIS: readonly ["type", "id", "icon", "featured", "origin", "layout", "slug", "anchor", "variant", "component"];
export declare const CampoSchema: z.ZodObject<{
    key: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    type: z.ZodEnum<["text", "longtext", "markdown", "image", "url", "textList"]>;
    help: z.ZodOptional<z.ZodString>;
    maxLength: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
    key: string;
    label: string;
    help?: string | undefined;
    maxLength?: number | undefined;
}, {
    type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
    key: string;
    label: string;
    help?: string | undefined;
    maxLength?: number | undefined;
}>;
export declare const ListaSchema: z.ZodType<Lista>;
export type Campo = z.infer<typeof CampoSchema>;
export interface Lista {
    key: string;
    label: string;
    itemLabel: string;
    fields: Campo[];
    resizable: boolean;
    minItems?: number;
    maxItems?: number;
    lists?: Lista[];
}
export declare const SecaoSchema: z.ZodEffects<z.ZodObject<{
    label: z.ZodString;
    fields: z.ZodDefault<z.ZodArray<z.ZodObject<{
        key: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
        type: z.ZodEnum<["text", "longtext", "markdown", "image", "url", "textList"]>;
        help: z.ZodOptional<z.ZodString>;
        maxLength: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
        key: string;
        label: string;
        help?: string | undefined;
        maxLength?: number | undefined;
    }, {
        type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
        key: string;
        label: string;
        help?: string | undefined;
        maxLength?: number | undefined;
    }>, "many">>;
    lists: z.ZodDefault<z.ZodArray<z.ZodType<Lista, z.ZodTypeDef, Lista>, "many">>;
}, "strip", z.ZodTypeAny, {
    label: string;
    fields: {
        type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
        key: string;
        label: string;
        help?: string | undefined;
        maxLength?: number | undefined;
    }[];
    lists: Lista[];
}, {
    label: string;
    fields?: {
        type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
        key: string;
        label: string;
        help?: string | undefined;
        maxLength?: number | undefined;
    }[] | undefined;
    lists?: Lista[] | undefined;
}>, {
    label: string;
    fields: {
        type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
        key: string;
        label: string;
        help?: string | undefined;
        maxLength?: number | undefined;
    }[];
    lists: Lista[];
}, {
    label: string;
    fields?: {
        type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
        key: string;
        label: string;
        help?: string | undefined;
        maxLength?: number | undefined;
    }[] | undefined;
    lists?: Lista[] | undefined;
}>;
/**
 * Os controles de um formulário de lead. É a lista do contrato C4.
 *
 * É outra lista, e não a de `TIPOS_DE_CAMPO`, porque descreve outra coisa: o
 * que o visitante preenche, e não o que o cliente edita no painel. Um `select`
 * não é conteúdo, e uma `image` não é pergunta.
 */
export declare const TIPOS_DE_CAMPO_DE_FORMULARIO: readonly ["text", "longtext", "email", "phone", "number", "date", "select", "checkbox"];
/**
 * As chaves que viram coluna fixa do lead. As outras vão para `Lead.data`.
 */
export declare const CHAVES_FIXAS_DO_LEAD: readonly ["name", "email", "phone", "message"];
/**
 * A chave de um campo de formulário, como o C4 a define.
 *
 * Sem ponto e sem hífen porque ela vira chave de `Lead.data` e nome de coluna
 * do CSV: `aceite.whatsapp` seria lido como objeto aninhado de um lado e como
 * texto do outro.
 */
export declare const CHAVE_DE_CAMPO_DE_FORMULARIO: RegExp;
/**
 * O id de um formulário, que o site envia como `origin`.
 *
 * Mais estrito que o C4, que não diz nada: ele vai para um atributo HTML, para
 * a URL do filtro de Leads e para o nome do arquivo exportado. Um id com
 * espaço ou barra funcionaria em dois desses lugares e quebraria no terceiro.
 */
export declare const ID_DE_FORMULARIO: RegExp;
export declare const OpcaoSchema: z.ZodObject<{
    value: z.ZodString;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
    value: string;
}, {
    label: string;
    value: string;
}>;
export declare const CampoDeFormularioSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["text", "longtext", "email", "phone", "number", "date", "select", "checkbox"]>;
    required: z.ZodOptional<z.ZodBoolean>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
    key: string;
    label: string;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    required?: boolean | undefined;
}, {
    type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
    key: string;
    label: string;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    required?: boolean | undefined;
}>;
export type CampoDeFormulario = z.infer<typeof CampoDeFormularioSchema>;
export declare const FormularioSchema: z.ZodEffects<z.ZodObject<{
    label: z.ZodString;
    fields: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["text", "longtext", "email", "phone", "number", "date", "select", "checkbox"]>;
        required: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
        key: string;
        label: string;
        options?: {
            label: string;
            value: string;
        }[] | undefined;
        required?: boolean | undefined;
    }, {
        type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
        key: string;
        label: string;
        options?: {
            label: string;
            value: string;
        }[] | undefined;
        required?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    label: string;
    fields: {
        type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
        key: string;
        label: string;
        options?: {
            label: string;
            value: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[];
}, {
    label: string;
    fields: {
        type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
        key: string;
        label: string;
        options?: {
            label: string;
            value: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[];
}>, {
    label: string;
    fields: {
        type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
        key: string;
        label: string;
        options?: {
            label: string;
            value: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[];
}, {
    label: string;
    fields: {
        type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
        key: string;
        label: string;
        options?: {
            label: string;
            value: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[];
}>;
export type Formulario = z.infer<typeof FormularioSchema>;
/**
 * As páginas que o painel edita, por idioma.
 *
 * Sem esta chave o site é estático para o painel. Com ela, a api lê cada
 * `inputs/content/<idioma>/pages/<página>.md` e semeia o conteúdo (C6).
 */
export declare const PaginasSchema: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
export declare const ManifestoSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    pages: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>>;
    sections: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        fields: z.ZodDefault<z.ZodArray<z.ZodObject<{
            key: z.ZodEffects<z.ZodString, string, string>;
            label: z.ZodString;
            type: z.ZodEnum<["text", "longtext", "markdown", "image", "url", "textList"]>;
            help: z.ZodOptional<z.ZodString>;
            maxLength: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
            key: string;
            label: string;
            help?: string | undefined;
            maxLength?: number | undefined;
        }, {
            type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
            key: string;
            label: string;
            help?: string | undefined;
            maxLength?: number | undefined;
        }>, "many">>;
        lists: z.ZodDefault<z.ZodArray<z.ZodType<Lista, z.ZodTypeDef, Lista>, "many">>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        fields: {
            type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
            key: string;
            label: string;
            help?: string | undefined;
            maxLength?: number | undefined;
        }[];
        lists: Lista[];
    }, {
        label: string;
        fields?: {
            type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
            key: string;
            label: string;
            help?: string | undefined;
            maxLength?: number | undefined;
        }[] | undefined;
        lists?: Lista[] | undefined;
    }>, {
        label: string;
        fields: {
            type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
            key: string;
            label: string;
            help?: string | undefined;
            maxLength?: number | undefined;
        }[];
        lists: Lista[];
    }, {
        label: string;
        fields?: {
            type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
            key: string;
            label: string;
            help?: string | undefined;
            maxLength?: number | undefined;
        }[] | undefined;
        lists?: Lista[] | undefined;
    }>>;
    forms: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        fields: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            label: z.ZodString;
            type: z.ZodEnum<["text", "longtext", "email", "phone", "number", "date", "select", "checkbox"]>;
            required: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                value: string;
            }, {
                label: string;
                value: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
            key: string;
            label: string;
            options?: {
                label: string;
                value: string;
            }[] | undefined;
            required?: boolean | undefined;
        }, {
            type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
            key: string;
            label: string;
            options?: {
                label: string;
                value: string;
            }[] | undefined;
            required?: boolean | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        label: string;
        fields: {
            type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
            key: string;
            label: string;
            options?: {
                label: string;
                value: string;
            }[] | undefined;
            required?: boolean | undefined;
        }[];
    }, {
        label: string;
        fields: {
            type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
            key: string;
            label: string;
            options?: {
                label: string;
                value: string;
            }[] | undefined;
            required?: boolean | undefined;
        }[];
    }>, {
        label: string;
        fields: {
            type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
            key: string;
            label: string;
            options?: {
                label: string;
                value: string;
            }[] | undefined;
            required?: boolean | undefined;
        }[];
    }, {
        label: string;
        fields: {
            type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
            key: string;
            label: string;
            options?: {
                label: string;
                value: string;
            }[] | undefined;
            required?: boolean | undefined;
        }[];
    }>>>;
}, "strip", z.ZodTypeAny, {
    version: 1;
    sections: Record<string, {
        label: string;
        fields: {
            type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
            key: string;
            label: string;
            help?: string | undefined;
            maxLength?: number | undefined;
        }[];
        lists: Lista[];
    }>;
    pages?: Record<string, string[]> | undefined;
    forms?: Record<string, {
        label: string;
        fields: {
            type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
            key: string;
            label: string;
            options?: {
                label: string;
                value: string;
            }[] | undefined;
            required?: boolean | undefined;
        }[];
    }> | undefined;
}, {
    version: 1;
    sections: Record<string, {
        label: string;
        fields?: {
            type: "text" | "longtext" | "markdown" | "image" | "url" | "textList";
            key: string;
            label: string;
            help?: string | undefined;
            maxLength?: number | undefined;
        }[] | undefined;
        lists?: Lista[] | undefined;
    }>;
    pages?: Record<string, string[]> | undefined;
    forms?: Record<string, {
        label: string;
        fields: {
            type: "number" | "text" | "longtext" | "date" | "email" | "phone" | "select" | "checkbox";
            key: string;
            label: string;
            options?: {
                label: string;
                value: string;
            }[] | undefined;
            required?: boolean | undefined;
        }[];
    }> | undefined;
}>;
export type Manifesto = z.infer<typeof ManifestoSchema>;
/**
 * Lê e valida o manifesto do repositório.
 *
 * Falha alto, no build. Um manifesto inválido publicado é pior que build
 * quebrado: a API cai para a camada 2, o painel mostra os campos do template
 * padrão, e o cliente edita um campo que este site não renderiza. A edição é
 * aceita, descartada e reportada como salva — o modo de falha é o silêncio, e
 * ele já aconteceu nesta plataforma.
 */
export declare function carregarManifesto(bruto: unknown): Manifesto;
/**
 * Todo caminho editável que o manifesto declara, achatado.
 *
 * `hero.headline`, `services.items[].title`. É a forma que dá para comparar
 * com o que as variantes de fato marcam com `data-codati-path`.
 */
export declare function caminhosDeclarados(manifesto: Manifesto): string[];
