import { describe, expect, it } from 'vitest';
import manifestoDoMolde from './fixtures/manifesto-do-molde.json';
import {
  conferirDist,
  conferirHtml,
  conferirManifesto,
  conferirPaginas,
  type Falha,
} from '../src/contrato';
import { carregarManifesto, type Manifesto } from '../src/manifest';

/**
 * O verificador do contrato. Cada teste é uma quebra muda que ele existe para
 * dizer em voz alta — e, para cada uma, que ele fica quieto quando está certo.
 * Um verificador que reprova tudo é tão inútil quanto um que aprova tudo.
 */

const manifesto: Manifesto = carregarManifesto({
  version: 1,
  pages: { 'pt-br': ['home', 'sobre'] },
  sections: { hero: { label: 'Topo', fields: [{ key: 'headline', label: 'Título', type: 'text' }] } },
  forms: {
    contato: {
      label: 'Contato',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true },
        { key: 'email', label: 'E-mail', type: 'email' },
        { key: 'phone', label: 'WhatsApp', type: 'phone' },
      ],
    },
    orcamento: {
      label: 'Orçamento',
      fields: [
        { key: 'name', label: 'Nome', type: 'text' },
        { key: 'email', label: 'E-mail', type: 'email', required: true },
        { key: 'tipo', label: 'Tipo', type: 'select', options: [{ value: 'a', label: 'A' }] },
      ],
    },
  },
});

const CANONICAL = '<link rel="canonical" href="https://aurora.com.br/">';

const formContato = (extra = '', origem = 'contato', action = 'https://borda/leads') =>
  `<form method="post" action="${action}" data-codati-form="${origem}">` +
  '<input type="text" name="name" required><input type="text" name="_contato" required>' +
  `${extra}<input type="text" name="_gotcha" tabindex="-1"><button type="submit">Enviar</button></form>`;

const problemas = (falhas: Falha[]) => falhas.map((f) => f.problema);

describe('manifesto', () => {
  it('o do molde passa', () => {
    expect(conferirManifesto(manifestoDoMolde).falhas).toEqual([]);
  });

  it('inválido devolve cada problema com o caminho, e nenhum manifesto', () => {
    const { manifesto: m, falhas } = conferirManifesto({ version: 2, sections: {} });

    expect(m).toBeNull();
    expect(falhas[0].onde).toBe('codati.manifest.json › version');
  });

  it('erro na raiz diz "(raiz)"', () => {
    expect(conferirManifesto('não é objeto').falhas[0].onde).toBe('codati.manifest.json › (raiz)');
  });

  it('sem pages reprova: para o painel o site seria estático', () => {
    const { manifesto: m, falhas } = conferirManifesto({ version: 1, sections: {} });

    expect(m).not.toBeNull();
    expect(problemas(falhas)).toEqual([expect.stringMatching(/não declara páginas/)]);
  });
});

describe('páginas', () => {
  const arquivos: Record<string, string> = {
    'inputs/content/pt-br/pages/home.md': '---\ntitle: Início\nsections:\n  - type: hero\n    id: topo\n---\n',
    'inputs/content/pt-br/pages/sobre.md': '---\ntitle: Sobre\n---\nTexto corrido.',
  };
  const ler = (c: string) => arquivos[c] ?? null;

  it('tudo presente e declarado passa', () => {
    expect(conferirPaginas(manifesto, ler)).toEqual([]);
  });

  it('página declarada sem arquivo reprova', () => {
    const falhas = conferirPaginas(manifesto, (c) => (c.endsWith('sobre.md') ? null : ler(c)));

    expect(falhas).toEqual([
      { onde: 'inputs/content/pt-br/pages/sobre.md', problema: expect.stringMatching(/não existe/) },
    ]);
  });

  it('bloco de tipo que o manifesto não descreve reprova: o cliente vê e não edita', () => {
    const falhas = conferirPaginas(manifesto, (c) =>
      c.endsWith('home.md') ? '---\ntitle: Início\nsections:\n  - type: galeria\n  - {}\n---\n' : ler(c),
    );

    expect(falhas.map((f) => f.onde)).toEqual([
      'inputs/content/pt-br/pages/home.md › sections.0',
      'inputs/content/pt-br/pages/home.md › sections.1',
    ]);
    expect(falhas[0].problema).toMatch(/"galeria" não está em "sections"/);
  });

  it('sem title, ou com YAML quebrado, reprova', () => {
    expect(
      problemas(conferirPaginas(manifesto, (c) => (c.endsWith('home.md') ? '---\ndescription: x\n---\n' : ler(c)))),
    ).toEqual(['falta "title" no frontmatter']);

    expect(
      problemas(conferirPaginas(manifesto, (c) => (c.endsWith('home.md') ? '---\ntitle: [aberto\n---\n' : ler(c)))),
    ).toEqual([expect.stringMatching(/não é YAML válido/)]);
  });

  it('manifesto sem pages não confere página nenhuma', () => {
    expect(conferirPaginas({ ...manifesto, pages: undefined }, () => null)).toEqual([]);
  });
});

describe('formulários no HTML', () => {
  it('o formulário do contrato passa, com o campo único e a armadilha', () => {
    expect(conferirHtml('dist/index.html', CANONICAL + formContato(), manifesto, {})).toEqual([]);
  });

  it('origem que o manifesto não declara reprova', () => {
    expect(problemas(conferirHtml('x', CANONICAL + formContato('', 'newsletter'), manifesto, {}))).toEqual([
      expect.stringMatching(/"newsletter" não está em "forms"/),
    ]);
  });

  it('data-codati-form vazio reprova', () => {
    expect(problemas(conferirHtml('x', CANONICAL + formContato('', ''), manifesto, {}))).toEqual([
      expect.stringMatching(/sem valor/),
    ]);
  });

  it('campo a mais sem declaração reprova; campo declarado ausente também', () => {
    const html = CANONICAL + formContato('<select name="cidade"></select>').replace('<input type="text" name="name" required>', '');

    expect(problemas(conferirHtml('x', html, manifesto, {}))).toEqual([
      expect.stringMatching(/"cidade" não está declarado/),
      expect.stringMatching(/declara "name" e o formulário não tem/),
    ]);
  });

  it('com e-mail obrigatório, os campos separados são o esperado, e _contato é estranho', () => {
    const certo =
      '<form data-codati-form="orcamento"><input name="name"><input name="email"><select name="tipo"></select></form>';
    const errado =
      '<form data-codati-form="orcamento"><input name="name"><input name="_contato"><select name="tipo"></select></form>';

    expect(conferirHtml('x', CANONICAL + certo, manifesto, {})).toEqual([]);
    expect(problemas(conferirHtml('x', CANONICAL + errado, manifesto, {}))).toEqual([
      expect.stringMatching(/"_contato" não está declarado/),
      expect.stringMatching(/declara "email"/),
    ]);
  });

  it('formulário sem data-codati-form não é da plataforma e não é conferido', () => {
    expect(conferirHtml('x', `${CANONICAL}<form action="/busca"><input name="q"></form>`, manifesto, {})).toEqual([]);
  });

  it('com o amortecedor no ambiente, o action tem de ser ele', () => {
    const ambiente = { PUBLIC_LEADS_URL: 'https://borda/leads' };

    expect(conferirHtml('x', CANONICAL + formContato(), manifesto, ambiente)).toEqual([]);
    expect(
      problemas(conferirHtml('x', CANONICAL + formContato('', 'contato', '/api/contato'), manifesto, ambiente)),
    ).toEqual([expect.stringMatching(/o action é "\/api\/contato"/)]);
  });
});

describe('caminhos de edição e canonical', () => {
  it('o formato do painel passa; página na frente, sufixo e undefined reprovam', () => {
    const html =
      CANONICAL +
      '<h1 data-codati-path="sections.0.headline">a</h1>' +
      '<p data-codati-path="sections.1.items.2.title">b</p>' +
      '<h1 data-codati-path="home.sections.0.headline">c</h1>' +
      '<p data-codati-path="undefined.brand.text">d</p>' +
      '<p data-codati-path="sections.0">e</p>';

    expect(conferirHtml('x', html, manifesto, {}).map((f) => f.onde)).toEqual([
      'x › home.sections.0.headline',
      'x › undefined.brand.text',
      'x › sections.0',
    ]);
  });

  it('campo da página passa: é onde mora o texto de uma página de texto corrido', () => {
    const html =
      CANONICAL +
      '<h1 data-codati-path="title">a</h1>' +
      '<div data-codati-path="body">b</div>' +
      '<p data-codati-path="intro.headline">c</p>' +
      '<p data-codati-path="services.2.title">d</p>' +
      '<p data-codati-path="undefined">e</p>' +
      '<p data-codati-path="sections">f</p>' +
      '<p data-codati-path="home.body.sections.0">g</p>';

    expect(conferirHtml('x', html, manifesto, {}).map((f) => f.onde)).toEqual([
      'x › undefined',
      'x › sections',
      'x › home.body.sections.0',
    ]);
  });

  it('link, lista e item do editor seguem o mesmo formato, e dizem qual atributo errou', () => {
    const html =
      CANONICAL +
      '<a data-codati-link="sections.0.cta.link">a</a>' +
      '<div data-codati-list="sections.1.items"><article data-codati-item="sections.1.items.0">b</article></div>' +
      '<a data-codati-link="undefined.cta.link">c</a>' +
      '<div data-codati-list="home.sections.1.items">d</div>';

    expect(conferirHtml('x', html, manifesto, {})).toEqual([
      { onde: 'x › undefined.cta.link', problema: expect.stringMatching(/data-codati-link fora do formato/) },
      { onde: 'x › home.sections.1.items', problema: expect.stringMatching(/data-codati-list fora do formato/) },
    ]);
  });

  it('sem canonical reprova', () => {
    expect(problemas(conferirHtml('x', '<p>oi</p>', manifesto, {}))).toEqual(['falta <link rel="canonical">']);
  });

  it('com SITE_DOMAIN, o canonical tem de apontar para ele — host ou URL', () => {
    expect(conferirHtml('x', CANONICAL, manifesto, { SITE_DOMAIN: 'aurora.com.br' })).toEqual([]);
    expect(conferirHtml('x', CANONICAL, manifesto, { SITE_DOMAIN: 'https://Aurora.com.br/' })).toEqual([]);

    const exemplo = '<link href="https://exemplo.pages.dev/" rel="canonical">';
    expect(problemas(conferirHtml('x', exemplo, manifesto, { SITE_DOMAIN: 'aurora.com.br' }))).toEqual([
      expect.stringMatching(/aponta para "https:\/\/exemplo.pages.dev\/"/),
    ]);
  });

  it('canonical que não é URL não derruba o verificador', () => {
    const torto = '<link rel="canonical" href="http://[quebrado">';
    expect(problemas(conferirHtml('x', torto, manifesto, { SITE_DOMAIN: 'aurora.com.br' }))).toHaveLength(1);
  });
});

describe('dist inteiro', () => {
  const completo = () =>
    new Map([
      ['index.html', '<html></html>'],
      ['sitemap-index.xml', '<sitemapindex/>'],
      ['_worker.js/index.js', 'export default {}'],
    ]);

  it('completo passa', () => {
    expect(conferirDist(completo(), {})).toEqual([]);
    expect(conferirDist(new Map([['index.html', ''], ['sitemap.xml', '']]), {})).toEqual([]);
  });

  it('sem index.html e sem sitemap reprova', () => {
    expect(problemas(conferirDist(new Map(), {}))).toEqual([
      expect.stringMatching(/falta index.html/),
      expect.stringMatching(/falta o sitemap/),
    ]);
  });

  it('o valor de EDGE_SECRET em qualquer arquivo publicado reprova, dizendo onde', () => {
    const arquivos = completo();
    arquivos.set('_worker.js/index.js', 'const s = "segredo-muito-secreto";');

    expect(conferirDist(arquivos, { EDGE_SECRET: 'segredo-muito-secreto' })).toEqual([
      { onde: 'dist/_worker.js/index.js', problema: expect.stringMatching(/EDGE_SECRET está publicado/) },
    ]);
  });

  it('segredo curto demais ou ausente não é procurado', () => {
    const arquivos = completo();
    arquivos.set('index.html', 'abc');

    expect(conferirDist(arquivos, { EDGE_SECRET: 'abc' })).toEqual([]);
  });
});
