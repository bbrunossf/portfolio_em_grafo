# Tech Project Graph

**Visualize e gerencie a complexidade dos seus projetos técnicos como um grafo interativo.**

[![Deploy to GitHub Pages](https://github.com/bbrunossf/portfolio_em_grafo/actions/workflows/deploy.yml/badge.svg)](https://github.com/bbrunossf/portfolio_em_grafo/actions/workflows/deploy.yml)

---

## Sobre o Projeto

Tech Project Graph é uma aplicação web SPA que permite mapear projetos, ferramentas e conhecimentos na forma de um **grafo de rede interativo**. Inspirado em visualizações de sistemas biológicos e redes complexas, a interface combina um tema escuro elegante com um canvas dinâmico onde cada elemento pulsa com identidade visual própria.

Ideal para engenheiros, pesquisadores e tech leads que desejam **documentar, explorar e compartilhar** o ecossistema técnico de seus projetos.

### De onde isto veio

O projeto começou como um exercício de recriar o **organograma da New York and Erie Railroad (1855)** — considerado o primeiro da história — e evoluiu por **sete experimentos em dois motores de grafo** (AntV G6 e Cytoscape.js) até a aplicação de hoje. O registro completo — o que cada tentativa era, o que ensinou, as medições que decidiram o motor e os testes que foram descartados — está em **[`docs/HISTORICO-projetos-de-grafo.md`](docs/HISTORICO-projetos-de-grafo.md)**.

---

## Funcionalidades

### Visualização do Grafo
- **Canvas interativo** com zoom (scroll), pan (arrastar) e reorganização de nós
- **2 layouts**: **Anéis (radial)** — o padrão, com os projetos num anel cronológico e ferramentas e tags em anéis externos — e **CoSe Bilkent** (força), para explorar agrupamentos
- **Visão Essencial / Completo** — abre com os projetos e as ferramentas compartilhadas (16 dos 63 nós, sem colisão de rótulo); um botão no header revela o grafo completo
- **Realce por proximidade** — ao passar o mouse sobre um nó, conexões relacionadas se destacam e o restante esmaece
- **Busca textual** com destaque visual do nó correspondente e suas conexões
- **Arraste de nós** com salvamento automático da posição

### Gerenciamento de Dados
- **3 tipos de nós**:  
  | Tipo | Cor | Forma | Descrição |
  |------|-----|-------|-----------|
  | Projeto | Laranja `#FF6B35` | Elipse grande (58px) | Projetos com datas, tarefas, ferramentas, tags, etc. |
  | Ferramenta | Azul ciano `#00D9FF` | Elipse pequena (34px) | Tecnologias e ferramentas utilizadas |
  | Tag | Verde `#10B981` | Diamante | Tags de conhecimento, tarefas ou resultados |  
  

- **Criação e edição de nós** via painel lateral com formulário completo
- **Criação de relações** (arestas) entre quaisquer nós
- **Sincronização automática**:
  - `Ferramentas` — cria nós de ferramenta a partir das listas dos projetos e conecta-os automaticamente
  - `Tags` — cria nós de tag a partir das tags dos projetos e conecta-os automaticamente
- **Exportação/Importação** de dados em JSON
- **Limpeza total** dos dados com confirmação

### Persistência
- Os dados são carregados do arquivo `public/mydata.json` na inicialização
- Alterações são salvas automaticamente no **localStorage** do navegador
- Exporte para JSON e faça backup a qualquer momento

### Interface
- **Tema escuro** com gradiente de fundo (`#1a1a2e` → `#0f0f1e`)
- **Header minimalista** com logo SVG, busca, seletor de layout e botões de ação
- **Painéis laterais** (NodePanel e RelationPanel) com animação de deslize
- **Contador de nós** no canto do canvas
- **Página 404** estilizada com botão de retorno
- Totalmente **responsivo** (desktop, tablet e mobile)

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Visualização | Cytoscape.js + react-cytoscapejs |
| Layouts | cytoscape-cose-bilkent + composição radial própria (anéis) |
| Roteamento | wouter (SPA client-side) |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Estado | Zustand |
| Ícones | Lucide React |
| Notificações | Sonner |
| Temas | next-themes (dark/light switchable) |
| Hospedagem | GitHub Pages |

---

## Estrutura do Projeto

```
portfolio_em_grafo/
├── docs/
│   └── HISTORICO-projetos-de-grafo.md  # Registro da evolução: 7 experimentos, 2 motores de grafo
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── mydata.json          # Dados iniciais do grafo
│   └── 404.html             # Redirect para SPA no GitHub Pages
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui (button, input, select, etc.)
│   │   ├── ErrorBoundary.tsx
│   │   ├── GraphCanvas.tsx   # Canvas Cytoscape — coração da aplicação
│   │   ├── Header.tsx        # Header com busca, layout e ações
│   │   ├── NodeCounter.tsx   # Contador de nós no canvas
│   │   ├── NodePanel.tsx     # Painel de criação/edição de nós
│   │   └── RelationPanel.tsx # Painel de criação de relações
│   ├── contexts/
│   │   └── ThemeContext.tsx   # Provedor de tema (dark/light)
│   ├── hooks/
│   │   ├── graphStore.ts     # Store Zustand com toda a lógica do grafo
│   │   └── useLocalStorage.ts# Persistência em localStorage + carga inicial
│   ├── lib/
│   │   └── utils.ts          # Função cn() para classes condicionais
│   ├── pages/
│   │   ├── Home.tsx          # Página principal
│   │   └── NotFound.tsx      # Página 404
│   ├── App.tsx               # Componente raiz com rotas e providers
│   ├── index.css             # CSS global + variáveis Tailwind
│   └── main.tsx              # Entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml        # Deploy automático no GitHub Pages
```

---

## Modelo de Dados

### Nó (`GraphNode`)

```typescript
type NodeType = 'projeto' | 'ferramenta' | 'tag';

interface ProjetoNode {
  id: string;
  tipo: 'projeto';
  nome: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  ferramentas?: string[];
  tarefas?: string[];
  complexidade?: 'Baixa' | 'Média' | 'Alta';
  conhecimentos?: string[];
  resultados?: string[];
  tags?: { nome: string; peso: number }[];
  x?: number;
  y?: number;
}

interface FerramentaNode {
  id: string;
  tipo: 'ferramenta';
  nome: string;
  finalidade?: string;
  contexto?: string;
  x?: number;
  y?: number;
}

interface TagNode {
  id: string;
  tipo: 'tag';
  nome: string;
  x?: number;
  y?: number;
}
```

### Aresta (`GraphEdge`)

```typescript
interface GraphEdge {
  id: string;
  source: string;   // ID do nó de origem
  target: string;   // ID do nó de destino
  tipo?: string;    // Tipo da relação
}
```

---

## Guia de Uso

### Adicionar um projeto
1. Clique em **Novo Nó** no header
2. Selecione o tipo **Projeto**
3. Preencha nome, descrição, datas, ferramentas, tarefas, tags, etc.
4. Clique em **Criar**

### Conectar elementos
1. Clique em **Relação** no header
2. Selecione o nó de origem e o nó de destino
3. Confirme

### Sincronizar automaticamente
- **Ferramentas**: lê a lista de ferramentas de cada projeto e cria os nós + arestas automaticamente
- **Tags**: faz o mesmo para as tags associadas aos projetos

### Buscar um nó
- Digite na caixa de busca do header e pressione **Enter** ou clique na lupa
- O nó correspondente será destacado junto com suas conexões
- Clique no **X** para limpar a busca

### Alterar o layout
- Use o dropdown no header para escolher entre **Anéis (radial)** e **CoSe Bilkent (força)**
- Clique no ícone de **embaralhar** 🔀 para rodar a ordem dos nós nos anéis

### Alternar a visão
- O botão de visão no header (**Essencial 16** / **Completo 63**) troca o recorte: Essencial mostra os projetos e as ferramentas usadas por 2 ou mais projetos; Completo mostra os 63 nós, incluindo as tags
- A legenda no canto do canvas acompanha o recorte: "Total: 16 (+47 ocultos)"

### Exportar/Importar
- **Exportar**: baixa um arquivo JSON com todos os nós (as arestas não são incluídas na exportação)
- **Importar**: carrega um arquivo JSON. Campos ausentes (id, tipo) são preenchidos automaticamente

---

## Desenvolvimento Local

### Pré-requisitos
- Node.js 22+
- npm

### Instalação

```bash
git clone https://github.com/bbrunossf/portfolio_em_grafo.git
cd portfolio_em_grafo
npm install
```

### Rodar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:5173` no navegador.

### Build de produção

```bash
npm run build
```

A saída vai para a pasta `dist/`.

### Preview do build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Deploy

O projeto é hospedado no **GitHub Pages** com deploy automático via GitHub Actions.

- **URL**: [https://bbrunossf.github.io/portfolio_em_grafo/](https://bbrunossf.github.io/portfolio_em_grafo/)
- **Branch**: `master`
- **Workflow**: `.github/workflows/deploy.yml`
- **Trigger**: push na branch `master`

O workflow executa:
1. Checkout do código
2. Instalação de dependências (`npm ci`)
3. Build de produção (`npm run build`)
4. Upload do artifact (`dist/`)
5. Deploy no GitHub Pages

### Configuração do GitHub Pages

O repositório deve ter **Settings → Pages → Source: GitHub Actions** habilitado. O arquivo `vite.config.ts` define `base: "/portfolio_em_grafo/"` para que todos os assets sejam servidos com o prefixo correto.

---

## Design

O design segue a abordagem **Organic Network Aesthetic**, inspirada em design biofílico e visualização de sistemas complexos.

- **Hierarquia cromática**: cada tipo de nó tem uma cor e forma distintas
- **Fluidez orgânica**: layouts dinâmicos sem rigidez de grade
- **Profundidade**: sombras, blur e sobreposição criam sensação de camadas
- **Minimalismo funcional**: apenas elementos essenciais visíveis; detalhes sob interação

### Paleta de Cores

| Elemento | Cor |
|----------|-----|
| Projetos | `#FF6B35` (laranja coral) |
| Ferramentas | `#00D9FF` (azul ciano) |
| Tags | `#10B981` (verde esmeralda) |
| Fundo | Gradiente `#1a1a2e` → `#0f0f1e` |
| Arestas | `#D1D5DB` |

---

## Licença

Projeto **público**: o código está em [github.com/bbrunossf/portfolio_em_grafo](https://github.com/bbrunossf/portfolio_em_grafo). Não há arquivo de licença formal — e sem ele os direitos ficam reservados ao autor, mesmo com o repositório aberto.

---

## TODO

- [x] Recorte de visão (Essencial/Completo) — as ferramentas de uso único ficam ocultas por padrão
- [ ] Agrupamento das ferramentas por categoria (é o que ainda aperta a leitura nos 63 nós)
- [ ] Visualização cronológica explícita (a ordem do anel já é cronológica; falta uma legenda de anos)
- [ ] Importação de arestas no JSON de entrada
- [ ] Temas customizáveis
- [ ] Filtros avançados por tipo, complexidade, período
