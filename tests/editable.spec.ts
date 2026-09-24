import { describe, expect, it } from 'vitest';
import {
    CONTRACT_ATTRIBUTE,
    CONTRACT_VERSION,
    EMPTY_IMAGE,
    contractAttributes,
    editable,
    editableItem,
    editableLink,
    editableList,
    editableSection,
    global as campoDoSite,
    globalLink as destinoDoSite,
    isPreview,
    itemPath,
    showEmpty,
} from '../src/editable';

/**
 * These attributes are the entire contract between this template and the Codati
 * panel. The panel reads paths off the DOM and writes them back into the draft,
 * so a wrong path is not a cosmetic bug — it saves the client's text into the
 * wrong field.
 */
describe('editable', () => {
    it('addresses a field within its section', () => {
        expect(editable('sections.0', 'headline')).toEqual({
            'data-codati-path': 'sections.0.headline',
            'data-codati-kind': 'text',
        });
    });

    it('carries the kind so the panel knows how to edit it', () => {
        expect(editable('sections.0', 'image', 'image')['data-codati-kind']).toBe('image');
        expect(editable('sections.0', 'content', 'richtext')['data-codati-kind']).toBe('richtext');
    });

    it('addresses the base path itself when no key is given', () => {
        expect(editable('sections.5.before.image', undefined, 'image')).toEqual({
            'data-codati-path': 'sections.5.before.image',
            'data-codati-kind': 'image',
        });
    });

    it('keeps a dotted key intact', () => {
        // `cta.label` is one field at a nested path, not two.
        expect(editable('sections.0', 'cta.label')['data-codati-path']).toBe(
            'sections.0.cta.label',
        );
    });

    it('annotates nothing when there is no base path', () => {
        // A component rendered outside a content-driven page — a 404, a blog
        // post — must not claim a path that does not exist, or the panel would
        // write the client's edit into a field the page does not have.
        expect(editable(undefined, 'headline')).toEqual({});
        expect(editable('', 'headline')).toEqual({});
    });
});

describe('itemPath', () => {
    it('addresses an entry inside a list', () => {
        expect(itemPath('sections.3', 'items', 2)).toBe('sections.3.items.2');
    });

    it('keeps index zero rather than treating it as absent', () => {
        expect(itemPath('sections.3', 'items', 0)).toBe('sections.3.items.0');
    });

    it('stays undefined without a base path, so nested fields go unannotated', () => {
        expect(itemPath(undefined, 'items', 0)).toBeUndefined();
    });
});

describe('editableSection', () => {
    it('marks the element that draws a whole section', () => {
        expect(editableSection('sections.2', 'pricing')).toEqual({
            'data-codati-section': 'sections.2',
            'data-codati-section-type': 'pricing',
        });
    });

    it('annotates nothing without a path', () => {
        expect(editableSection(undefined, 'pricing')).toEqual({});
    });
});

describe('o contrato do editor interativo', () => {
    it('o destino de um botão fica no elemento do link, com o caminho do campo', () => {
        expect(editableLink('sections.0', 'cta.link')).toEqual({ 'data-codati-link': 'sections.0.cta.link' });
        expect(editableLink(undefined, 'cta.link')).toEqual({});
    });

    it('lista e item levam o caminho que a api usa', () => {
        expect(editableList('sections.2', 'items')).toEqual({ 'data-codati-list': 'sections.2.items' });
        expect(editableItem('sections.2', 'items', 3)).toEqual({ 'data-codati-item': 'sections.2.items.3' });
        expect(editableList(undefined, 'items')).toEqual({});
        expect(editableItem(undefined, 'items', 0)).toEqual({});
    });

    it('só a rota de prévia marca a página como prévia', () => {
        expect(isPreview({ codatiPreview: true })).toBe(true);
        expect(isPreview({ codatiPreview: 'sim' })).toBe(false);
        expect(isPreview({})).toBe(false);
        expect(isPreview(undefined)).toBe(false);
    });

    it('campo vazio só aparece na prévia, e só em bloco com caminho', () => {
        expect(showEmpty({ codatiPreview: true }, 'sections.0')).toBe(true);
        // O menu e o rodapé não têm caminho: vazio lá continua sem desenhar nada.
        expect(showEmpty({ codatiPreview: true }, undefined)).toBe(false);
        expect(showEmpty({}, 'sections.0')).toBe(false);
    });

    it('a foto vazia da prévia é uma imagem de verdade, sem sair do site', () => {
        expect(EMPTY_IMAGE.startsWith('data:image/svg+xml')).toBe(true);
        expect(decodeURIComponent(EMPTY_IMAGE)).toContain('Escolher foto');
    });
});

/**
 * The version the site declares (2026-09-17).
 *
 * The attributes above are a language, and a site keeps speaking the one it was
 * built with. Without a number on the page the panel cannot tell which site it
 * is talking to: on the day the contract changes it would draw the field, take
 * the client's text and write it to a path that no longer exists — accepted,
 * dropped, reported as saved.
 */
describe('the edit contract version', () => {
    it('is a whole number, so the panel can compare it', () => {
        expect(Number.isInteger(CONTRACT_VERSION)).toBe(true);
        expect(CONTRACT_VERSION).toBeGreaterThan(0);
    });

    it('rides on the name the platform and the panel both look for', () => {
        // Three repositories read this string. Renaming it here alone makes
        // every site look unversioned, which the panel reads as version 1 —
        // silently wrong rather than loudly broken.
        expect(CONTRACT_ATTRIBUTE).toBe('data-codati-contract');
    });

    it('is what `<html>` spreads, as a string the DOM can carry', () => {
        expect(contractAttributes()).toEqual({ 'data-codati-contract': String(CONTRACT_VERSION) });
    });

    /**
     * O campo do site, que o rodapé desenha em toda página.
     *
     * Ele não é da página: mora uma vez só no conteúdo global
     * (`GET/PUT /content/company`). Como o `BaseLayout` monta o rodapé sem
     * página, `editable()` recebia `path` indefinido e devolvia `{}` — o
     * rodapé saía **sem nenhuma anotação**, e a única forma de mexer nele era
     * um formulário de doze campos no painel.
     */
    describe('global', () => {
        it('prefixa com `company`, que é o que diz ao painel onde gravar', () => {
            expect(campoDoSite('name')).toEqual({
                'data-codati-path': 'company.name',
                'data-codati-kind': 'text',
            });
        });

        it('campo aninhado mantém o caminho inteiro', () => {
            expect(campoDoSite('address.city')['data-codati-path']).toBe('company.address.city');
        });

        it('aceita outro tipo, como qualquer anotação', () => {
            expect(campoDoSite('logo', 'image')['data-codati-kind']).toBe('image');
        });

        it('não depende de página nenhuma, que é o ponto', () => {
            // `editable(undefined, 'name')` devolve `{}`; este sempre marca.
            expect(Object.keys(campoDoSite('name'))).toHaveLength(2);
        });
    });
});

/**
 * O campo que o nó **não** mostra.
 *
 * O link do WhatsApp exibe a palavra "WhatsApp" e tira o `href` do telefone.
 * Anotado como texto, editar o rótulo gravava "WhatsApp" dentro do número — e
 * o link passava a apontar para o que o cliente digitou. É também o que torna
 * o telefone alcançável numa variante que só desenha um botão ou um ícone.
 */
describe('globalLink', () => {
    it('aponta o destino para o campo do site, sem prometer que o texto é o valor', () => {
        expect(destinoDoSite('phone')).toEqual({ 'data-codati-link': 'company.phone' });
    });

    it('não devolve data-codati-path: quem tem path é editado por cima', () => {
        expect(destinoDoSite('phone')).not.toHaveProperty('data-codati-path');
    });
});

/**
 * O espaço reservado é o editor falando, e o visitante nunca o vê.
 *
 * Em 2026-09-21 o usuário viu "Escolher foto" na prévia e não no site, e leu
 * como promessa quebrada — "o editor mostra uma coisa e meu site é outra". A
 * leitura estava certa: nada na tela distinguia enfeite de conteúdo.
 */
describe('EMPTY_IMAGE', () => {
    const svg = decodeURIComponent(EMPTY_IMAGE.replace('data:image/svg+xml;charset=utf-8,', ''));

    it('diz o que fazer', () => {
        expect(svg).toContain('Escolher foto');
    });

    it('e diz que o visitante não vê este espaço', () => {
        expect(svg).toContain('só você vê este espaço');
    });
});

