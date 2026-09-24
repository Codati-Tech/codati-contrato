import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifestoDoMolde from './fixtures/manifesto-do-molde.json';
import { carregarManifesto, type Formulario } from '../src/manifest';
import {
  CAMPO_ARMADILHA,
  CAMPO_CONTATO,
  SEM_CONTATO,
  controlesDoFormulario,
  formularioDaOrigem,
  montarEnvio,
  type EntradaDoFormulario,
} from '../src/formulario';

/**
 * O formulário é onde o site paga por si mesmo, e todo defeito dele é mudo: o
 * site continua bonito e o lead chega sem coluna, com a origem errada, ou não
 * chega. Os testes abaixo são os modos de falha, um por um.
 */

const ORCAMENTO: Formulario = {
  label: 'Orçamento',
  fields: [
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'phone', label: 'WhatsApp', type: 'phone' },
    {
      key: 'tipo',
      label: 'O que você precisa',
      type: 'select',
      required: true,
      options: [
        { value: 'jardim-novo', label: 'Jardim novo' },
        { value: 'manutencao', label: 'Manutenção' },
        { value: 'projeto', label: 'Projeto' },
      ],
    },
    { key: 'area', label: 'Área em m²', type: 'number' },
    { key: 'aceite', label: 'Aceito contato por WhatsApp', type: 'checkbox' },
  ],
};

const campo = (name: string, value: string, type = 'text'): EntradaDoFormulario => ({
  name,
  type,
  value,
});

describe('o que o formulário desenha', () => {
  it('o select sai com as três opções declaradas, na ordem', () => {
    const tipo = controlesDoFormulario(ORCAMENTO).find(
      (c) => c.tipo === 'campo' && c.campo.key === 'tipo',
    );

    expect(tipo?.tipo === 'campo' && tipo.campo.options?.map((o) => o.value)).toEqual([
      'jardim-novo',
      'manutencao',
      'projeto',
    ]);
  });


  it('e-mail e telefone opcionais viram uma linha só, onde o primeiro estava', () => {
    // Decidido em 2026-09-13: dois campos de contato derrubam a conversão.
    const controles = controlesDoFormulario(ORCAMENTO);

    expect(controles.map((c) => (c.tipo === 'contato' ? c.name : c.campo.key))).toEqual([
      'name',
      CAMPO_CONTATO,
      'tipo',
      'area',
      'aceite',
    ]);
    expect(controles[1]).toMatchObject({ label: 'WhatsApp ou E-mail' });
  });

  it('com um dos dois obrigatório, os dois aparecem separados', () => {
    // A linha única com o e-mail obrigatório aceitaria um telefone e o
    // formulário recusaria no envio — uma regra que o visitante não vê.
    const obrigatorio: Formulario = {
      label: 'X',
      fields: [
        { key: 'email', label: 'E-mail', type: 'email', required: true },
        { key: 'phone', label: 'WhatsApp', type: 'phone' },
      ],
    };

    expect(controlesDoFormulario(obrigatorio).map((c) => c.tipo)).toEqual(['campo', 'campo']);
  });

  it('só um dos dois declarado não inventa a linha única', () => {
    const soEmail: Formulario = {
      label: 'X',
      fields: [{ key: 'email', label: 'E-mail', type: 'email' }],
    };

    expect(controlesDoFormulario(soEmail)).toEqual([{ tipo: 'campo', campo: soEmail.fields[0] }]);
  });
});

describe('o que o formulário envia', () => {
  const preenchido: EntradaDoFormulario[] = [
    campo('name', ' Ana '),
    campo(CAMPO_CONTATO, '(41) 99999-0000'),
    campo('tipo', 'manutencao', 'select'),
    campo('area', '40,5', 'number'),
    { name: 'aceite', type: 'checkbox', value: 'on', checked: true },
    campo(CAMPO_ARMADILHA, ''),
  ];

  it('origin é o id do formulário, e o caminho da página vai em data._pagina', () => {
    // Com o caminho em `origin`, dois formulários na mesma página viravam uma
    // origem só, e o painel não tinha como saber que colunas mostrar.
    const envio = montarEnvio(preenchido, 'aurora-paisagismo', 'orcamento', '/servicos');

    expect(envio).toEqual({
      acao: 'enviar',
      corpo: {
        site_slug: 'aurora-paisagismo',
        origin: 'orcamento',
        name: 'Ana',
        phone: '41999990000',
        data: { tipo: 'manutencao', area: 40.5, aceite: true, _pagina: '/servicos' },
      },
    });
  });

  it('checkbox desmarcado vai false, e não some', () => {
    // O FormData omite o desmarcado. Sem a chave, "não aceitou" fica igual a
    // "o formulário nem perguntava".
    const envio = montarEnvio(
      [campo('email', 'ana@x.com', 'email'), { name: 'aceite', type: 'checkbox', value: 'on', checked: false }],
      's',
      'orcamento',
      '/',
    );

    expect(envio.acao === 'enviar' && envio.corpo.data).toEqual({ aceite: false, _pagina: '/' });
  });

  it('o campo único com @ vira e-mail, na raiz', () => {
    const envio = montarEnvio([campo(CAMPO_CONTATO, 'ana@x.com')], 's', 'contato', '/');

    expect(envio.acao === 'enviar' && envio.corpo.email).toBe('ana@x.com');
    expect(envio.acao === 'enviar' && envio.corpo.phone).toBeUndefined();
  });

  it('sem contato válido, recusa com o texto que diz o que fazer', () => {
    // O amortecedor recusaria de qualquer jeito; recusar aqui é o que deixa
    // o visitante corrigir antes de perder o que escreveu.
    expect(montarEnvio([campo('name', 'Ana'), campo(CAMPO_CONTATO, '9999')], 's', 'contato', '/')).toEqual({
      acao: 'recusar',
      motivo: SEM_CONTATO,
    });
  });

  it('telefone e e-mail em campos separados passam pela mesma régua', () => {
    const envio = montarEnvio(
      [campo('email', 'sem-arroba', 'email'), campo('phone', '41 99999-0000', 'tel')],
      's',
      'contato',
      '/',
    );

    expect(envio).toMatchObject({ acao: 'enviar', corpo: { phone: '41999990000' } });
    expect(envio.acao === 'enviar' && 'email' in envio.corpo).toBe(false);

    expect(montarEnvio([campo('phone', '12345', 'tel')], 's', 'contato', '/').acao).toBe('recusar');
  });

  it('a armadilha preenchida finge que recebeu e não monta corpo nenhum', () => {
    expect(montarEnvio([...preenchido, campo(CAMPO_ARMADILHA, 'http://spam')], 's', 'o', '/')).toEqual({
      acao: 'fingir',
    });
  });

  it('nome com _ é do site e não vira coluna; opcional vazio e número inválido não vão', () => {
    const envio = montarEnvio(
      [
        campo('email', 'ana@x.com', 'email'),
        campo('_interno', 'x'),
        campo('', 'sem nome'),
        campo('cidade', '   '),
        campo('area', 'muito', 'number'),
        campo('message', 'Quero orçamento', 'textarea'),
      ],
      's',
      'contato',
      '/contato',
    );

    expect(envio).toEqual({
      acao: 'enviar',
      corpo: {
        site_slug: 's',
        origin: 'contato',
        email: 'ana@x.com',
        message: 'Quero orçamento',
        data: { _pagina: '/contato' },
      },
    });
  });
});

describe('o bloco aponta para um formulário declarado', () => {
  const manifesto = carregarManifesto(manifestoDoMolde);

  it('sem origin, usa o formulário contato — e o molde declara um', () => {
    expect(formularioDaOrigem(manifesto, undefined).origem).toBe('contato');
    expect(formularioDaOrigem(manifesto, '  ').origem).toBe('contato');
  });

  it('origem que o manifesto não declara quebra o build dizendo o que existe', () => {
    expect(() => formularioDaOrigem(manifesto, 'orcamento')).toThrow(
      /"orcamento".*não declara.*Declarados: contato/,
    );
    expect(() => formularioDaOrigem({ forms: undefined }, 'contato')).toThrow(
      /não declara formulário nenhum/,
    );
  });
});

describe('o manifesto recusa formulário que não entrega', () => {
  const com = (forms: unknown) => () => carregarManifesto({ version: 1, sections: {}, forms });

  it('formulário sem email nem phone reprova', () => {
    // Parece funcionar e nunca entrega: o amortecedor recusa lead sem contato.
    expect(
      com({ contato: { label: 'Contato', fields: [{ key: 'name', label: 'Nome', type: 'text' }] } }),
    ).toThrow(/sem "email" nem "phone"/);
  });

  it('select sem opção, ou com valor repetido, reprova', () => {
    const select = (options: unknown) =>
      com({
        o: {
          label: 'O',
          fields: [
            { key: 'email', label: 'E-mail', type: 'email' },
            { key: 'tipo', label: 'Tipo', type: 'select', options },
          ],
        },
      });

    expect(select(undefined)).toThrow(/"tipo" é select e não tem opção nenhuma/);
    expect(select([])).toThrow(/não tem opção nenhuma/);
    expect(
      select([
        { value: 'a', label: 'A' },
        { value: 'a', label: 'B' },
      ]),
    ).toThrow(/duas opções com o mesmo valor/);
  });

  it('chave repetida, chave fora do formato e tipo desconhecido reprovam', () => {
    const campos = (fields: unknown) => com({ o: { label: 'O', fields } });
    const email = { key: 'email', label: 'E-mail', type: 'email' };

    expect(campos([email, email])).toThrow(/"email" aparece duas vezes/);
    expect(campos([email, { key: 'Cidade', label: 'Cidade', type: 'text' }])).toThrow(/letra minúscula/);
    expect(campos([email, { key: 'foto', label: 'Foto', type: 'image' }])).toThrow(/inválido/);
  });

  it('id de formulário fora do formato reprova', () => {
    const ok = { label: 'O', fields: [{ key: 'email', label: 'E-mail', type: 'email' }] };

    expect(com({ '/contato': ok })).toThrow(/id de formulário/);
    expect(com({ 'formacao-clinica': ok })).not.toThrow();
  });

  it('manifesto sem forms continua válido', () => {
    expect(() => carregarManifesto({ version: 1, sections: {} })).not.toThrow();
  });
});

describe('pages', () => {
  const com = (pages: unknown) => () => carregarManifesto({ version: 1, sections: {}, pages });

  it('aceita páginas por idioma', () => {
    expect(com({ 'pt-br': ['home', 'sobre'] })).not.toThrow();
  });

  it('recusa idioma vazio, página repetida e nome fora do formato', () => {
    expect(com({ 'pt-br': [] })).toThrow(/idioma sem página nenhuma/);
    expect(com({ 'pt-br': ['home', 'home'] })).toThrow(/página repetida/);
    expect(com({ 'pt-br': ['Home'] })).toThrow(/nome de página/);
    expect(com({ portugues: ['home'] })).toThrow(/idioma no formato/);
  });

});
