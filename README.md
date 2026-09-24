# codati-contrato

O contrato entre um site e a plataforma Codati, em código: o que um site
precisa para ser editado pelo painel, receber leads e ser conferido antes de
ir ao ar. A especificação por extenso é o `CONTRATO-DO-SITE.md` do repositório
de specs.

Público de propósito: a build do Cloudflare Pages clona só o repositório do
site e não instala dependência privada. O molde, com os desenhos, continua
privado — aqui está só o protocolo.

## Usar num site

```sh
npm install "git+https://github.com/Codati-Tech/codati-contrato.git#v1.0.1"
```

| Entrada | O que é |
| :--- | :--- |
| `codati-contrato/ponte` | `iniciarPonte()` — o lado do site da conversa com o editor, só na rota de prévia |
| `codati-contrato/anotacao` | `editable`, `editableSection`, `editableList`, `editableItem`, `editableLink`, `showEmpty`, `contractAttributes`… |
| `codati-contrato/manifesto` | o esquema do `codati.manifest.json` |
| `codati-contrato/formulario` | controles e envio de formulário de lead |
| `codati-contrato/leads` | destino e corpo do lead |
| `codati-contrato/contrato` | as conferências que o verificador faz |

O verificador roda depois do `npm run build`, no diretório do site:

```sh
npx codati-verificar-contrato
```

Sai com código 1 e a lista do que faltou. Pôr no fim do `build` faz a build
reprovada não ir ao ar.

**`destinoDoLead` recebe o ambiente por parâmetro.** O pacote não lê
`import.meta.env`: o Vite só o substitui no código que transforma, e dentro de
`node_modules` o valor chega indefinido. Passe
`{ ...import.meta.env, ...Astro.locals.runtime?.env }`.

## Mudar

O `dist/` é versionado — o GitHub não compila na instalação. Depois de mudar o
`src/`: `npm run build`, `npm test`, `npm run conferir:dist`, commit, e uma tag
nova. Os sites sobem de versão trocando a tag no `package.json`.
