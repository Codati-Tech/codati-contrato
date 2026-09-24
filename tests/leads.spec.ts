import { describe, expect, it } from 'vitest';
import {
  corpoDoLead,
  destinoDoLead,
  separarContato,
  temContato,
} from '../src/leads';

/**
 * O formulário é onde o site paga por si mesmo. Um formulário que não entrega
 * o lead **não quebra nada visível**: o site continua bonito, o cliente
 * continua pagando, e os leads vão todos para o lixo.
 */
describe('destino do lead', () => {
  it('lê do runtime antes do build, como o pixel', () => {
    // O painel manda; o ambiente é reserva.
    expect(
      destinoDoLead({ PUBLIC_LEADS_URL: 'https://edge.codati.tech/leads' }).url,
    ).toBe('https://edge.codati.tech/leads');
  });

  it('sem destino configurado, devolve nulo em vez de inventar', () => {
    // Inventar uma URL faria o formulário parecer ligado e falhar em silêncio,
    // que é exatamente o defeito que se quer impedir.
    expect(destinoDoLead({}).url).toBeNull();
  });

  it('valor vazio conta como ausente', () => {
    expect(destinoDoLead({ PUBLIC_LEADS_URL: '   ' }).url).toBeNull();
  });
});

describe('o campo único de contato', () => {
  it('com arroba é e-mail', () => {
    expect(separarContato('joao@padaria.com.br')).toEqual({
      email: 'joao@padaria.com.br',
    });
  });

  it('sem arroba é telefone, e sobrevive à pontuação de gente', () => {
    // As pessoas digitam "(51) 99999-8888", não "5199999888".
    expect(separarContato('(51) 99999-8888')).toEqual({ phone: '51999998888' });
  });

  it('número curto demais não é telefone', () => {
    // Guardá-lo faria o amortecedor aceitar um lead que ninguém consegue
    // retornar.
    expect(separarContato('1234')).toEqual({});
  });

  it('vazio não vira contato', () => {
    expect(separarContato('   ')).toEqual({});
  });
});

describe('o corpo que o amortecedor espera', () => {
  it('leva o slug e a origem sempre', () => {
    const corpo = corpoDoLead({ email: 'a@a.com' }, 'padaria', 'home');

    expect(corpo.site_slug).toBe('padaria');
    expect(corpo.origin).toBe('home');
  });

  it('campo vazio não vira chave vazia no corpo', () => {
    // `name: ""` chegaria ao painel como um lead sem nome que parece ter um.
    const corpo = corpoDoLead({ email: 'a@a.com', name: '' }, 'padaria', 'home');

    expect(corpo).not.toHaveProperty('name');
  });

  it('o que o formulário perguntou a mais vai junto, inteiro', () => {
    // Um site pode perguntar o que quiser, e a resposta precisa chegar.
    const corpo = corpoDoLead(
      { email: 'a@a.com', quantas_pessoas: '40', data_do_evento: '2026-12-01' },
      'buffet',
      'contato',
    );

    expect(corpo.data).toEqual({
      quantas_pessoas: '40',
      data_do_evento: '2026-12-01',
    });
  });

  it('leva todos os campos conhecidos quando o cliente preenche tudo', () => {
    // Nome, telefone e mensagem vão em chaves próprias e não dentro de `data`:
    // o painel mostra colunas para eles, e enterrá-los faria a lista de leads
    // virar uma lista de objetos.
    const corpo = corpoDoLead(
      {
        name: 'João',
        email: 'a@a.com',
        phone: '51999998888',
        message: 'quero orçamento',
      },
      'padaria',
      'home',
    );

    expect(corpo).toMatchObject({
      name: 'João',
      email: 'a@a.com',
      phone: '51999998888',
      message: 'quero orçamento',
    });
    expect(corpo).not.toHaveProperty('data');
  });

  it('sem campo extra, não manda um `data` vazio', () => {
    const corpo = corpoDoLead({ email: 'a@a.com' }, 'padaria', 'home');

    expect(corpo).not.toHaveProperty('data');
  });
});

describe('quando vale mandar', () => {
  it('precisa de e-mail ou telefone', () => {
    // O amortecedor recusa sem os dois; conferir aqui evita mandar para
    // receber 400.
    expect(temContato({ email: 'a@a.com' })).toBe(true);
    expect(temContato({ phone: '51999998888' })).toBe(true);
    expect(temContato({ name: 'João', message: 'oi' })).toBe(false);
    expect(temContato({ email: '   ' })).toBe(false);
  });
});
