import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * O verificador é chamado como comando (`codati-verificar-contrato`), pelo
 * `build` do site. Sem a linha `#!/usr/bin/env node` o sistema o entrega ao
 * shell, que tenta executar o JavaScript como script e expande os `*` dos
 * comentários — foi assim que a v1.0.0 saiu, e a build do site falhou com
 * "README.md: not found".
 */
const BIN = join(__dirname, '../bin/verificar-contrato.mjs');

describe('o binário', () => {
    it('começa pela linha que o manda ao Node, e é executável', () => {
        expect(readFileSync(BIN, 'utf8').startsWith('#!/usr/bin/env node\n')).toBe(true);
        expect(statSync(BIN).mode & 0o111).not.toBe(0);
    });

    it('executado como comando, confere o diretório de onde foi chamado', () => {
        const vazio = mkdtempSync(join(tmpdir(), 'site-sem-manifesto-'));
        try {
            const r = spawnSync(BIN, [], { cwd: vazio, encoding: 'utf8' });
            expect(r.status).toBe(1);
            expect(r.stdout).toContain('codati.manifest.json');
            expect(r.stdout).toContain('o arquivo não existe');
        } finally {
            rmSync(vazio, { recursive: true, force: true });
        }
    });
});
