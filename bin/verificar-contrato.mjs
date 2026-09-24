/**
 * `npm run verificar:contrato` — o site cumpre a parte do contrato que dá
 * para conferir com código?
 *
 * Roda depois do `npm run build`, sobre o repositório e o `dist/`. Sai com
 * código 1 e a lista do que faltou, em português. O que ele confere e por quê
 * está em `src/utils/contrato.ts`; o contrato inteiro, em
 * `specs/11-sprint-final/CONTRATO-DO-SITE.md`.
 *
 * Todo site integrado roda isto na CI. Ele é copiado do molde junto com o
 * resto, e importa o `.ts` do molde direto — Node 22, sem compilar — para a
 * validação do manifesto ser a mesma do build.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  conferirDist,
  conferirHtml,
  conferirManifesto,
  conferirPaginas,
} from '../dist/contrato.js';

const RAIZ = process.cwd();
const DIST = join(RAIZ, 'dist');

/** Extensões que são texto e podem carregar um segredo vazado. */
const TEXTO = /\.(html|js|mjs|cjs|css|json|xml|txt|map|webmanifest|svg)$/i;

function ler(caminho) {
  const alvo = join(RAIZ, caminho);
  return existsSync(alvo) ? readFileSync(alvo, 'utf-8') : null;
}

function listar(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const alvo = join(pasta, nome);
    return statSync(alvo).isDirectory() ? listar(alvo) : [alvo];
  });
}

const falhas = [];
const brutoDoManifesto = ler('codati.manifest.json');

if (brutoDoManifesto === null) {
  falhas.push({ onde: 'codati.manifest.json', problema: 'o arquivo não existe na raiz do repositório' });
} else {
  let bruto;
  try {
    bruto = JSON.parse(brutoDoManifesto);
  } catch (erro) {
    falhas.push({ onde: 'codati.manifest.json', problema: `não é JSON válido: ${erro.message}` });
  }

  const { manifesto, falhas: doManifesto } = bruto === undefined
    ? { manifesto: null, falhas: [] }
    : conferirManifesto(bruto);
  falhas.push(...doManifesto);

  if (manifesto) {
    falhas.push(...conferirPaginas(manifesto, ler));

    if (!existsSync(DIST)) {
      falhas.push({ onde: 'dist/', problema: 'não existe. Rode `npm run build` antes de verificar' });
    } else {
      const arquivos = new Map();
      for (const alvo of listar(DIST)) {
        if (TEXTO.test(alvo)) arquivos.set(relative(DIST, alvo), readFileSync(alvo, 'utf-8'));
      }

      falhas.push(...conferirDist(arquivos, process.env));

      for (const [nome, conteudo] of arquivos) {
        if (nome.endsWith('.html')) falhas.push(...conferirHtml(`dist/${nome}`, conteudo, manifesto, process.env));
      }

      if (!process.env.SITE_DOMAIN) {
        console.log('Aviso: SITE_DOMAIN não está no ambiente, então o canonical não foi comparado com o endereço do site.');
      }
    }
  }
}

if (falhas.length === 0) {
  console.log('Contrato do site: tudo certo.');
  process.exit(0);
}

console.log(`Contrato do site: ${falhas.length} problema(s).\n`);
for (const { onde, problema } of falhas) console.log(`- ${onde}\n  ${problema}`);
process.exit(1);
