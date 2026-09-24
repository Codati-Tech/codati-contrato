/**
 * O `dist/` versionado é o que os sites instalam — o GitHub não compila nada
 * na instalação. Um `src/` alterado sem `npm run build` publicaria a versão
 * velha com o número novo, e ninguém veria: os testes rodam sobre o `src/`.
 *
 * Compila numa pasta temporária e compara, arquivo por arquivo, com o `dist/`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'codati-contrato-'));
try {
    execFileSync('npx', ['tsc', '-p', 'tsconfig.json', '--outDir', tmp], { stdio: 'inherit' });
    const esperado = readdirSync(tmp).sort();
    const atual = readdirSync('dist').sort();
    const diferentes = esperado.filter(
        (nome) => !atual.includes(nome) || readFileSync(join(tmp, nome), 'utf8') !== readFileSync(join('dist', nome), 'utf8'),
    );
    const sobrando = atual.filter((nome) => !esperado.includes(nome));
    if (diferentes.length || sobrando.length) {
        console.error('✗ dist/ não corresponde ao src/. Rode `npm run build` e commite o dist/.');
        for (const nome of [...diferentes, ...sobrando]) console.error(`    ${nome}`);
        process.exit(1);
    }
    console.log(`✓ dist/ corresponde ao src/ (${esperado.length} arquivos)`);
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
