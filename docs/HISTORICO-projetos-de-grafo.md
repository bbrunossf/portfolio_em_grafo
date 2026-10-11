# Histórico — projetos de grafo

> **Nota para quem chega pelo GitHub.** Isto é o registro de uma série de experimentações
> locais. Dos projetos citados, só dois sobrevivem: **este repositório** (o portfólio, em
> Cytoscape) e uma cópia funcional em AntV G6. As pastas `dendrograma`, `antv_v1`,
> `antv_v2_ferrovia` e `cytoscape_v1` foram apagadas — antes disso, o que valia a pena foi
> resgatado, e este documento guarda o que cada tentativa era e o que ela ensinou.

**Documento de registro.** Escrito em 10/10/2026, quando as pastas dos experimentos que
não foram adiante seriam apagadas. O objetivo é preservar o que cada tentativa era, o que
ela ensinou e o que foi melhorado em cada etapa — para que a decisão final (Cytoscape em
produção) não pareça arbitrária daqui a alguns meses.

**Onde este arquivo mora:** dentro do repositório do portfólio, em `docs/`. A primeira
versão ficou na pasta pessoal, para não se perder junto com as pastas que seriam apagadas;
o repositório é um lugar melhor, porque é o projeto que sobreviveu.

---

## O fio da meada

Tudo começou com uma imagem: o organograma da **New York and Erie Railroad, de 1855**,
feito por Daniel McCallum e George Holt Henshaw — considerado o primeiro organograma da
história. Uma árvore invertida, com o conselho de administração na base (a "raiz" que
sustenta) e as operações nas folhas.

Duas trilhas nasceram daí e correram em paralelo:

1. **Trilha ferrovia** — recriar aquele organograma. Era o objetivo original.
2. **Trilha portfólio** — usar a mesma linguagem de grafo para apresentar os projetos
   técnicos como uma rede: projetos, ferramentas e conhecimentos se conectando.

A trilha 1 chegou a um resultado bom e parou. A trilha 2 é a que virou produto — e é a
única que continua viva, junto com a cópia funcional do G6.

---

## Linha do tempo

| Data | Pasta | Motor | O que é | Situação |
|---|---|---|---|---|
| 31/05/2026 | `dendrograma` | React + G6 | Ferrovia: primeiro organograma em grafo | será apagada |
| 05/06/2026 | `dendrograma testes com AntV` | G6 v5 (CDN) + D3 (CDN) | Rascunhos de 1 arquivo: ferrovia e uma árvore D3 | será apagada |
| 17/06/2026 | `antv_v0` | Vite + TS + G6 | "teste 01": ambiente mínimo para aprender a API do G6 v5 | **VIVA** (cópia funcional) |
| 17/06/2026 | `antv_v1` | Vite + TS + G6 | "teste 02": o portfólio em G6, com nós HTML | será apagada |
| 17/06/2026 | `antv_v2_ferrovia` | Vite + TS + G6 | "teste 03": a ferrovia com plugins (title/tooltip/legend) | será apagada |
| 20/06/2026 | `cytoscape_v1` | React + Cytoscape | Andaime da migração — nunca recebeu código | será apagada |
| 20/06 → 07/07/2026 | `portfolio_em_grafo` | React 19 + Cytoscape + shadcn | O portfólio, em produção no GitHub Pages | **VIVA** |

> A trilha `opencvjs` (Python + DXF + LLM) fica fora deste documento: é outro assunto.

---

## 1. `dendrograma` — 31/05/2026

**Propósito.** Primeira tentativa de recriar o organograma de 1855, agora dentro do React.

**O que tem.** Projeto Vite + React + `@antv/g6`. O componente que interessa é
`src/novo.tsx` (267 linhas): monta a árvore com `treeToGraphData` e desenha o grafo.
`src/App.tsx` só faz `<Organograma />`. O `README.md` ficou **o do template do Vite**,
sem edição.

**O que funcionou.** Provou que G6 + React funciona no padrão `useEffect` + `new Graph()`
+ `destroy`, e definiu o modelo de dados da ferrovia que atravessou todos os testes
seguintes (conselho → presidência → 5 divisões regionais → departamentos).

**Limitação.** Sem layout, plugins ou estilo trabalhados: era um grafo funcional e feio.

---

## 2. `dendrograma testes com AntV` — 05/06/2026

**Propósito.** Testar sem build: arquivos HTML solos, biblioteca por CDN. É a pasta de
rascunho, e vale registrar item por item porque o conteúdo é heterogêneo:

| Arquivo | Linhas | O que é | Roda? |
|---|---|---|---|
| `antv_1.html` | 247 | **G6 v5** via unpkg + `treeToGraphData` + layout `compact-box` + tooltip. A ferrovia. | SIM |
| `teste_x.html` | 230 | Cópia de um módulo (`import ... from '@antv/g6'`) salva com extensão `.html`, **sem `<script>`** | NÃO |
| `index.html` | 160 | "Árvore de Conhecimentos Vintage Animada" — **D3 v7** (`d3.tree` + SVG), outra ideia | SIM |
| `2_index.html` | 168 | Segunda versão da mesma árvore D3 | SIM |
| `links AntV.txt` | 8 | Links que eu estava estudando — **todos do G6 v4** | — |

**O que ensinou.** Três coisas: (a) o layout `compact-box` é o certo para organograma;
(b) comparar D3 com G6 foi útil — o D3 desenha a árvore radial mais bonita, mas o G6 já
traz interação, tooltip e plugin prontos; (c) os links eram do **v4**, e o v4→v5 quebrou
a API — foi a primeira vez que esse custo apareceu.

**Nota.** `teste_x.html` é lixo: um módulo que nunca rodou. Não há nada a perder nele.

---

## 3. `antv_v0` — 17/06/2026 · **VIVA**

**Propósito.** "teste 01": ambiente mínimo para aprender a API do G6 v5 seguindo o
tutorial, sem a complexidade do portfólio.

**Estado em que estava.** 106 linhas num único `main.ts` com os dados inline. O
`npm run build` **não funcionava** — o `tsc` falhava com dois erros de tipo
(`TS7006`) e abortava antes do `vite build`, então nenhum `dist/` era gerado. Havia
código morto do template do Vite (`counter.ts`, 296 linhas de `style.css` que **nunca
eram importadas**, imagens não usadas), e os estados `active`/`neighborActive` estavam
declarados no estilo mas **nada nunca os acionava**.

**O que foi melhorado (sessão de 10/10/2026).**

- **Build destravado**: `tsc` passou a compilar sem erro e o `dist/` a ser gerado.
- **Código morto removido**: `counter.ts`, `src/assets/`, `public/icons.svg` e os
  seletores do template que sobraram no `style.css`.
- **Modularizado**: `src/data.ts` (tipos de domínio + dataset), `src/graph.ts`
  (configuração do G6 e interações), `src/main.ts` (entrada). Eram 106 linhas num
  arquivo; agora são três responsabilidades separadas.
- **Tipagem**: `strict: true` explícito no `tsconfig.json`; os dados de domínio foram
  para `NodeData['data']`, que é onde o G6 entrega dados do usuário aos callbacks de
  estilo. **Foi isso que fez o tamanho dos nós voltar a funcionar** — `size` solto na
  raiz do nó o G6 ignora, e por isso os 17 nós saíam todos iguais.
- **O destaque de vizinhança passou a existir**: ao passar o mouse, o nó fica verde
  (`active`), os vizinhos diretos amarelos (`neighborActive`) e o resto apagado
  (`inactive`). Eram exatamente os estados que estavam declarados e nunca acionados.
- **Menu de contexto com ações reais** (centralizar, destacar vizinhança, limpar
  destaques) no lugar de um `alert()`.
- **Tema claro/escuro** de verdade, aplicado também ao canvas (rótulos, arestas, grid),
  e legenda gerada da mesma tabela de cores do grafo.
- **Enquadramento**: o canvas ganhou altura real (`flex` + `min-height`), sem depender do
  padrão da biblioteca.

**Como verificar hoje.** `npm run dev` na pasta; a cena tem 17 nós e 16 arestas, hover
destaca a vizinhança, botão direito abre o menu.

---

## 4. `antv_v1` — 17/06/2026

**Propósito.** "teste 02" e a virada conceitual do projeto: **o portfólio em G6**. Sai a
ferrovia, entram projetos, ferramentas e conhecimentos.

**O que é.** `src/main.js` com 601 linhas e 5 projetos de exemplo (`projeto_1` a
`projeto_5`, com `ferramentas`, `complexidade` e `projetos_relacionados`). Os nós de
projeto são do tipo `group` + `html` — **cartões HTML de verdade dentro do grafo**, com
nome, datas, badges de ferramentas e lista de tarefas. Layout `d3-force`. Interações:
`hover-activate`, `click-select`, arrastar. Plugins: `title`, `tooltip`, `toolbar`,
`contextmenu`, `background`, `grid-line` (minimap chegou a ser escrito e ficou comentado).

**Procedência.** Não foi escrito à mão: o `README.md` registra que veio do gerador SIVE
da própria AntV.

**O que este projeto deixou.** O README dele é o documento mais útil da pasta: uma tabela
de funcionalidades, uma tabela de *funcionalidades futuras já mapeadas para o G6*
(zoom semântico, busca, persistência, criar aresta arrastando, `timebar` para linha do
tempo, combos para agrupar) e uma arquitetura de pastas sugerida. **E o código de nós
HTML em G6** — que é justamente o que o Cytoscape não faz nativamente.

**Por que parou.** Ver "A decisão de motor", adiante.

---

## 5. `antv_v2_ferrovia` — 17/06/2026

**Propósito.** "teste 03": voltar à ferrovia, agora com o acabamento que faltava — paleta
sépia, tipografia Georgia, layout `compact-box` com direção `BT` (raiz no topo) e os três
plugins na tela: `title` (título e subtítulo), `tooltip` (texto por nível hierárquico) e
`legend`.

**O que é.** `src/main.ts` com 231 linhas: o modelo de dados completo do organograma de
1855 (conselho → presidência → Susquehanna, Western, Eastern/Middle, Northern e
Transporte → departamentos) e a configuração do grafo.

**Procedência e estado.** O `README.md` diz "Não editei" e aponta o gerador SIVE da AntV.
A própria nota lista os defeitos conhecidos: sem configuração de colisão entre nós, e o
texto não centralizado dentro dos retângulos.

**O que deixou.** O modelo de dados definitivo da ferrovia e o trio de plugins
(title/tooltip/legend), que é reaproveitável em qualquer grafo explicativo.

---

## 6. `cytoscape_v1` — 20/06/2026

**Propósito.** Começar a migração do portfólio para o Cytoscape.js.

**Estado real.** É **o template padrão do Vite + React, intocado**. Instalei as
dependências (`cytoscape`, `react-cytoscapejs`, `cytoscape-cola`, `cytoscape-dagre`,
`cytoscape-cose-bilkent`), mas:

- **nenhuma referência a `cytoscape` existe em `src/`**;
- `src/App.tsx` ainda é a demonstração do contador do template (com os logos do React e
  do Vite);
- não tem git.

**Conclusão.** Não há nada a preservar aqui. O trabalho de Cytoscape de verdade começou no
mesmo dia, em `portfolio_em_grafo`, cujo primeiro commit é "primeira versao com
react-cytoscapejs" (20/06).

---

## 7. `portfolio_em_grafo` — 20/06 a 07/07/2026 · **VIVA**

**Propósito.** O portfólio em grafo, publicado. É o único projeto do conjunto com
repositório remoto e deploy automático.

**Stack.** React 19 + TypeScript, Vite, Cytoscape.js + `react-cytoscapejs`, layout
`cose-bilkent` + composição radial própria (anéis), Tailwind CSS v4 + shadcn/ui, Zustand,
wouter, Sonner, GitHub Pages.

**Evolução registrada nos 18 commits.**

```
primeira versao com react-cytoscapejs → cria nós de ferramentas automaticamente
→ antes de retirar o nó conhecimento → filtro para remover tags e ferramentas órfãs
→ add counter board → mydata.json → workflow do GitHub Pages
→ projetos em espiral e outras melhorias → edição das arestas, agora salvas no json
→ update GraphCanvas → alteração do nome do repo
→ composição do grafo em anéis + visão Essencial/Completo → limpeza de dependências
→ README: o repositório é público
```

### O experimento descartado: `teste-cytoscape-react` — 20/06/2026

Existe um branch no repositório (local e no remoto) com um único commit, `acdc61a`:
*"teste com o cytoscape react. Sem muitas vantagens"*. Ele sai do commit `c7e1806`
("primeira versao com react-cytoscapejs"). **Foi mantido de propósito, como registro** —
para não gastar tempo testando a mesma coisa duas vezes. Mas a mensagem do commit, sozinha,
não diz o que foi testado.

**O que ele tentou, de fato:**

- trocou o `react-cytoscapejs` por **`cytoscape-react@5.0.3`**, declarando o grafo como
  JSX (`<Graph><Node/><Edge/></Graph>`): 254 linhas do `GraphCanvas.tsx` reescritas, mais
  um `cytoscape-react.css` novo para posicionar as camadas do wrapper;
- **instalou o `cytoscape-dom-node@2.1.0`** — a extensão do Cytoscape para **nós com HTML
  dentro** — e **não chegou a usá-lo**: o pacote entrou no `package.json`, mas não é
  referenciado em nenhum arquivo do commit.

**Veredito da época:** o estilo declarativo em JSX não trouxe vantagem sobre o
`react-cytoscapejs`, e o master voltou para ele. A produção toda hoje é `react-cytoscapejs`.

**O que este registro evita concluir errado — e é o ponto principal:** que "nós com HTML
no Cytoscape já foram testados e não valem a pena". O que foi testado e reprovado foi a
**camada de declaração em JSX** (`cytoscape-react`). O **`cytoscape-dom-node` foi
instalado e nunca exercitado**. Ou seja: a ideia de cartão-HTML *dentro* do Cytoscape
**continua não testada** — é uma alternativa real ao G6 para essa parte, e o custo de
testá-la é baixo (registrar a extensão no `cy` e usar um `html()` por nó). O que o G6 tem
a mais é isso vir de fábrica.

### Melhorias da sessão de 10/10/2026 — primeira rodada (estilo e estado)

Esta rodada partiu de um levantamento: rodei o projeto, inspecionei o grafo pelo console
e comparei o que o seletor de layout dizia com o que o canvas mostrava.

- **O seletor de layout do header era decorativo.** `runAndSaveLayout` rodava
  `spiralProjects` + `compactOuterRings` **depois de qualquer layout**: concêntrico, CoSe
  e Dagre só definiam os ângulos de partida, e as posições finais eram sempre espiral +
  anéis. O cabeçalho dizia "Concêntrico" e a tela mostrava outra coisa. Corrigido: a
  composição virou um layout com nome próprio, e os outros passaram a valer de verdade.
- **O `cy.fit()` rodava antes do layout terminar**, enquadrando posições intermediárias.
  Foi para dentro do `layoutstop`, depois da composição.
- **Todas as arestas nasciam com a classe `edge-hidden`** (opacidade 0): o grafo parecia
  um punhado de pontos soltos. Agora são visíveis de forma discreta e ganham cor no foco.
- **`background-opacity: 0.3` nos nós** — a paleta que o README promete (`#FF6B35`,
  `#00D9FF`, `#10B981`) existia no código, mas quase transparente sobre o fundo escuro.
  Subiu para `0.92`: o grafo deixou de parecer apagado.
- **Rótulos**: halo preto com opacidade `0.15` (invisível) virou halo de verdade, e entrou
  `min-zoomed-font-size` para o texto sumir no zoom out em vez de virar sopa.
- **O título do header estava sendo coberto** pelo campo de busca: `.header-title` tinha
  `flex: 1` + `min-width: 0`, e como o `h1` usa `white-space: nowrap`, o texto transbordava
  por baixo do input.
- **Dependências mortas**: `@antv/g6` e `@antv/util` estavam instalados e **usados em zero
  arquivos** (53 MB em `node_modules`). Removidos em 11/10/2026 (`3254d3d`), junto com
  `cytoscape-cola`, `cytoscape-dagre`, `dagre`, `react-error-boundary`, `postcss` e
  `autoprefixer` — oito pacotes, sem mudar o bundle (nenhum deles estava nele).
- **Bundle**: 317 → **281 kB gzip**, só por retirar do bundle os registros de
  `cytoscape-cola` e `cytoscape-dagre`, que estavam importados sem serem usados.

### Melhorias da sessão de 10/10/2026 — segunda rodada (composição e dados)

- **Espiral abortada.** A ideia era o raio crescer a cada projeto para comunicar a passagem
  do tempo; na prática virava um caracol desalinhado com os outros anéis. Os projetos
  passaram a ficar num **anel**, mantendo a ordem cronológica no sentido horário.
- **Anéis empacotados.** O layout concêntrico do Cytoscape deixava um vão de **496px** entre
  o anel dos projetos e o das ferramentas (a origem do "muito espaço" e da fonte pequena,
  já que o zoom caía para 0,40). Agora o vão é de ~75px.
- **Zoom e legibilidade**: 0,40 → **0,936** (visão completa) e **1,378** (visão essencial).
  A fonte na tela saiu de **4,8px para 16,5px**.
- **Linhas de relação com tag**: eram tracejadas em verde; viraram **gradiente de laranja
  para verde** (`line-fill` do Cytoscape). Também normalizei a origem dessas arestas
  (sempre projeto → tag), senão o gradiente corria ao contrário em metade delas.
- **Anéis elípticos** (esticados 1,45× no eixo X): um círculo num canvas largo usava só 52%
  da largura. Agora usa 63%, com o zoom preservado.
- **Enquadramento só dos nós** — os pontos de controle das arestas bezier inflavam o
  bounding box e derrubavam o zoom.
- **Espaçamento por comprimento de arco.** Distribuir os nós por ângulos iguais numa elipse
  os amontoa nas pontas esquerda/direita. Passei a dividir por comprimento de arco.
  *(Aqui eu mesmo introduzi um bug: eu somava o deslocamento do "embaralhar" ao parâmetro
  da elipse. Numa elipse a parametrização não é polar — somar ao ângulo não gira o ponto, e
  o espaçamento uniforme se desfazia. Medi 105–206px onde deveria ser constante. Isolei a
  função no Node para provar que o cálculo estava certo, e a correção foi deslocar a ORDEM
  dos nós, não a geometria. Uniformidade final medida: projetos 142–150px, ferramentas
  101–102px e 127–128px, tags 181–184px.)*
- **Filtro de visão — Essencial / Completo.** O botão no header alterna entre 16 e 63 nós.
  A base foi a medição do próprio dado: **82% das ferramentas (31 de 38) aparecem em um
  único projeto**, e só 7 são compartilhadas. A visão Essencial mostra os projetos e as
  ferramentas usadas por 2+ projetos (16 nós, sem colisão de rótulo, imediatamente
  legível); um clique revela tudo. A legenda acompanha: "Total: 16 (+47 ocultos)".
- **Layouts removidos**: `cose` (achatava tudo numa linha), `dagre` (idem), e o
  `concentrico` do próprio Cytoscape — que era a origem exata do vão de 496px e do zoom
  0,40. Sobraram dois: **Anéis (radial)**, padrão, e **CoSe Bilkent (força)**.
- **Limpeza**: registros e declarações de tipo órfãos de `cytoscape-cola` removidos.

### Pendências registradas (não corrigidas)

- **A persistência em `localStorage` é só de ida.** `useLocalStorage` grava a cada
  alteração mas **nunca lê de volta** — nenhum `getItem` no projeto. Tudo recarrega do
  `mydata.json`. O README promete "alterações salvas automaticamente no localStorage";
  elas são salvas, só nunca restauradas. Corrigir muda comportamento do produto, então
  ficou para decisão.
- ~~**`cytoscape-cola`, `cytoscape-dagre` e `dagre` seguem no `package.json`** sem serem
  usados (já não entram no bundle, mas são instalados a cada `npm ci`).~~ **Resolvido em
  11/10/2026** (`3254d3d`): os três saíram, junto com os outros cinco pacotes sem uso. O
  `npm ci` deixou de reinstalá-los e o bundle não mudou.
- **Ainda há colisões de rótulo na visão completa** (63 nós). O próximo passo natural é
  agrupar as ferramentas por categoria.

### Infra do repositório — corrigido em 11/10/2026

- **A URL de push apontava para o nome antigo do repositório.** O `git remote -v` mostrava
  `portfolio_em_grafo` no fetch e `antv_v3_react1` no push — o nome de antes da renomeação.
  Funcionava por redirect do GitHub, mas era frágil. Agora os dois apontam para
  `portfolio_em_grafo`.
- **O README dizia branch `main`**; a branch real (e o gatilho do workflow) é `master`.
- **O README dizia "Este projeto é privado"**; o repositório é público desde a criação.
- **Deploy conferido, não presumido**: o push disparou o workflow *Deploy to GitHub Pages*
  (conclusão: sucesso) e o site no ar passou a servir o build novo — `index-fYg3IGxI.js`,
  com o botão "Essencial 16" e o seletor "Anéis (radial)", sem erros no console.

---

## A decisão de motor: por que ficou no Cytoscape

O `antv_v1` mostrou que o G6 faz uma coisa que o Cytoscape não faz: **nós HTML de verdade**
— cartões de projeto com badges, datas e tarefas dentro do grafo. Se a visão de "cada
projeto é um cartão" voltar, o G6 é o único caminho **nativo**.

> **Ressalva tirada do próprio histórico do repositório:** o Cytoscape **tem** um caminho
> não-nativo para isso — a extensão `cytoscape-dom-node`. Ela foi instalada em 20/06/2026
> (branch `teste-cytoscape-react`) e **nunca chegou a ser usada**. Então "cartões ricos"
> não é um impasse do Cytoscape: é uma opção barata e **ainda não testada**. O que o G6
> oferece a mais é isso ser nativo — e vir com `timebar`, combos e `hull` de fábrica.

Mesmo assim, a decisão foi manter o Cytoscape, por medição:

| | peso |
|---|---|
| `cytoscape.min.js` | 435 kB brutos → **134 kB gzip** |
| Bundle do portfólio (React + Cytoscape + shadcn + Tailwind) | 1,03 MB → **310 kB gzip** |
| App do G6 puro (sem React, 17 nós) | 1,41 MB → **396 kB gzip** |

Ou seja: **o G6 sozinho pesa ~2,9× o Cytoscape** e quase o app inteiro de hoje. Trocar
levaria o portfólio de ~310 kB para ~570 kB gzip.

E o argumento decisivo: **o que estava feio não era limite do motor.** Colisão de rótulo,
nós amontoados, arestas invisíveis, cores apagadas — tudo isso se resolveu com propriedades
que o Cytoscape 3.34 já tinha (`min-zoomed-font-size`, `text-background-*`, `underlay-*`,
`line-fill` para gradiente). Reescrever a camada de canvas para ganhar o mesmo resultado
seria pagar caro por nada.

**O gatilho para reabrir a discussão:** se o que incomodar passar a ser "os nós não mostram
conteúdo suficiente" (cartões ricos) ou "quero linha do tempo e agrupamento", isso é
território nativo do G6 (`timebar`, combos, `hull`) e a migração se justifica. O custo dela
é menor do que parece: muda só o `GraphCanvas.tsx` e as composições — o store, os painéis,
o shadcn, os dados e o deploy ficam.

**Motivo de manter o `antv_v0` vivo:** ele é a referência funcional e limpa do G6, com
destaque de vizinhança, menu de contexto, tema e build funcionando. É de onde partir se a
migração for retomada.

---

## O que sobrevive e o que se perde

### Sobrevive

| Pasta | Papel |
|---|---|
| `antv_v0` | Cópia funcional do G6 — referência técnica |
| `portfolio_em_grafo` | O portfólio em produção (repositório remoto + deploy) |

### Será apagado

| Pasta | O que se perde | O que foi resgatado |
|---|---|---|
| `dendrograma` | Primeira versão da ferrovia em React+G6. Superada pelo `antv_v2_ferrovia`. | Nada. |
| `dendrograma testes com AntV` | A árvore radial em D3 (`index.html`, `2_index.html`) e o `teste_x.html`, que é um módulo quebrado. | `antv_1.html` |
| `antv_v1` | O projeto inteiro em G6, menos o arquivo resgatado. | `src/main.js` |
| `antv_v2_ferrovia` | O projeto inteiro, menos o arquivo resgatado. | `src/main.ts` |
| `cytoscape_v1` | Nada — é o template do Vite intocado. | Nada. |

### O resgate, feito em 10/10/2026

Os três arquivos foram copiados para **`antv_v0/_referencia/`** (a pasta que sobrevive),
byte a byte, com hash SHA-256 conferido contra os originais — 1.079 linhas de código no
total:

```
antv_v1/src/main.js              → antv_v0/_referencia/antv_v1-main.js
antv_v2_ferrovia/src/main.ts     → antv_v0/_referencia/antv_v2_ferrovia-main.ts
dendrograma testes com AntV/antv_1.html → antv_v0/_referencia/antv_1.html
```

A pasta tem um `README.md` próprio explicando o que é cada arquivo e como rodar cada um de
novo, e **não entra no build**: o `tsconfig.json` do `antv_v0` só inclui `src/`.

Ficaram de fora, de propósito:

- **o `README.md` do `antv_v1`** (tabela de funcionalidades, lista de features futuras já
  mapeadas para o G6 e arquitetura sugerida) — o conteúdo está resumido no capítulo 4
  deste documento;
- **`teste_x.html`** — não roda: é um módulo salvo com extensão `.html`;
- todo o resto (template do Vite, imagens de scaffold, `index.html`s de exemplo).


---

## Estado final do que ficou vivo

**`antv_v0`** — `tsc` sem erros, `npm run build` gerando `dist/`, 17 nós / 16 arestas,
hover com destaque de vizinhança, menu de contexto, tema claro/escuro responsivo.

**`portfolio_em_grafo`** — `tsc` sem erros, build ok, **282 kB gzip**, deploy no
GitHub Pages. Abre na visão Essencial (16 nós, fonte 16,5px, sem colisão) com um botão
para revelar os 63. Busca, hover por proximidade, arrastar com salvamento de posição,
importar/exportar JSON e o seletor de layout com duas opções que funcionam de verdade.

**Resolvido em 11/10/2026.** As alterações do portfólio foram commitadas e publicadas
(`98dda56` composição e visão · `3254d3d` limpeza de dependências · `80d16cf` README), com
deploy conferido no GitHub Pages. As dependências sem uso saíram do `package.json`.
