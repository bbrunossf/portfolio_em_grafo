import React, { useEffect, useMemo, useRef } from 'react';
import { Graph, NodeEvent } from '@antv/g6';
import type { EdgeData, GraphData, IElementEvent, NodeData } from '@antv/g6';
import { useGraphStore, visibleNodeIds } from '../hooks/graphStore';
import type {
  FerramentaNode,
  GraphEdge,
  GraphNode,
  NodeType,
  ProjetoNode,
  TagNode,
} from '../hooks/graphStore';
import './GraphCanvas.css';
import './GraphCanvasG6.css';

/* ============================================================================
 * Canvas em AntV G6 (v5) — mesma interface do canvas em Cytoscape.
 *
 * O store, os painéis, os dados e o deploy não sabem qual das duas está
 * montada: para voltar ao Cytoscape basta o Home importar `./GraphCanvas`.
 *
 * O que o G6 traz e o Cytoscape não: **cartão HTML de verdade** dentro do grafo.
 * O que ele NÃO traz de graça é a composição — o layout `concentric` embutido
 * usa o tamanho do nó como degrau entre anéis, e com cartões de ~200px cada
 * anel pula ~100px além do necessário (o enquadramento caiu para 0,40 e a fonte
 * do cartão para 4,8px na tela). Por isso os anéis aqui são calculados à mão,
 * com a mesma lógica que ficou boa no Cytoscape: mesmo comprimento de arco
 * entre vizinhos, elipse esticada no eixo X e um anel por tipo de nó.
 * ==========================================================================*/

/* -------------------------------- paleta --------------------------------- */

const CORES: Record<NodeType, string> = {
  projeto: '#FF6B35',
  ferramenta: '#00D9FF',
  tag: '#10B981',
};

/** Acento do cartão pela complexidade, como no canvas em Cytoscape. */
const COR_COMPLEXIDADE: Record<string, string> = {
  Alta: '#e74c3c',
  Média: '#f39c12',
  Baixa: '#27ae60',
};

/**
 * Caixa do cartão. Este número é o orçamento visual inteiro: ele define o raio
 * mínimo do anel dos projetos (para 9 cartões lado a lado) e, por consequência,
 * o zoom do enquadramento e o tamanho da fonte na tela.
 */
const CARTAO: [number, number] = [204, 132];
const TAM_FERRAMENTA: [number, number] = [46, 46];
const TAM_TAG: [number, number] = [30, 30];

/** Acima disso as ferramentas não cabem num anel só: sobraria menos que o rótulo. */
const MAX_FERRAMENTAS_UM_ANEL = 14;

/** Folga entre cartões vizinhos, ao longo do arco do anel. */
const FOLGA_CARTAO = 22;

/** Distância radial entre o anel de projetos e o de ferramentas. */
const PASSO_FERRAMENTA = CARTAO[1] / 2 + TAM_FERRAMENTA[1] / 2 + 26;

/** Distância radial entre o anel de ferramentas e o de tags. */
const PASSO_TAG = 68;

/** Esticamento horizontal: um círculo num canvas 1600×827 deixa faixas mortas. */
const X_STRETCH = 1.5;

/** Quanto cabe no cartão antes de virar "+N". */
const MAX_BADGES = 4;
const MAX_TAREFAS = 3;

/* -------------------------------- helpers -------------------------------- */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** O dado vem de um JSON editável e o cartão é montado como HTML. */
const esc = (valor: unknown): string => String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

const nomeDoNo = (d: NodeData): string =>
  String((d.data as { nome?: string } | undefined)?.nome ?? d.id);

/**
 * Cartão do projeto, em HTML.
 *
 * Tem de sair daqui como STRING pronta. O nó `html` do G6 5.x entrega o valor
 * direto ao `appendChild` do container: passar uma função `(d) => html` estoura
 * com "parameter 1 is not of type 'Node'" — era um dos dois bugs que impediam os
 * cartões de aparecerem no projeto antigo. O outro era o `type: 'html'` dentro
 * de `style`, quando ele pertence ao nível do nó.
 */
const cartaoHTML = (p: ProjetoNode, selecionado = false): string => {
  const accent = COR_COMPLEXIDADE[p.complexidade ?? ''] ?? CORES.projeto;
  const periodo = [p.data_inicio, p.data_fim].filter(Boolean).join(' → ');
  const ferramentas = p.ferramentas ?? [];
  const tarefas = p.tarefas ?? [];

  const badges =
    ferramentas
      .slice(0, MAX_BADGES)
      .map((f) => `<span class="g6-card__badge">${esc(f)}</span>`)
      .join('') +
    (ferramentas.length > MAX_BADGES
      ? `<span class="g6-card__badge g6-card__badge--mais">+${ferramentas.length - MAX_BADGES}</span>`
      : '');

  const lista =
    tarefas
      .slice(0, MAX_TAREFAS)
      .map((t) => `<li class="g6-card__tarefa">${esc(t)}</li>`)
      .join('') +
    (tarefas.length > MAX_TAREFAS
      ? `<li class="g6-card__tarefa g6-card__tarefa--mais">+${tarefas.length - MAX_TAREFAS} tarefa(s)</li>`
      : '');

  return [
    `<div class="g6-card${selecionado ? ' g6-card--selecionado' : ''}" data-no="${esc(p.id)}" style="--accent:${accent}">`,
    '<div class="g6-card__topo">',
    `<span class="g6-card__nome">${esc(p.nome)}</span>`,
    p.complexidade ? `<span class="g6-card__complexidade">${esc(p.complexidade)}</span>` : '',
    '</div>',
    '<div class="g6-card__corpo">',
    periodo ? `<div class="g6-card__periodo">${esc(periodo)}</div>` : '',
    badges ? `<div class="g6-card__badges">${badges}</div>` : '',
    lista ? `<ul class="g6-card__tarefas">${lista}</ul>` : '',
    '</div>',
    '</div>',
  ].join('');
};

/* --------------------------- composição dos anéis -------------------------- */

/**
 * Ângulos que dividem a elipse em arcos de MESMO COMPRIMENTO.
 *
 * Numa elipse, passos iguais no parâmetro andam devagar nas pontas
 * esquerda/direita e rápido no topo/base — os nós ficavam amontoados justamente
 * onde os rótulos colidem. Aqui a divisão é por comprimento de arco (integrado
 * numericamente), então o espaçamento fica uniforme em volta do anel.
 */
const angulosEspacados = (qtd: number, stretch: number, rotacao: number): number[] => {
  if (qtd <= 0) return [];

  const passos = 720;
  const acumulado: number[] = [0];
  let total = 0;

  for (let i = 1; i <= passos; i++) {
    const t0 = ((i - 1) / passos) * 2 * Math.PI;
    const t1 = (i / passos) * 2 * Math.PI;
    total += Math.hypot(
      stretch * (Math.cos(t1) - Math.cos(t0)),
      Math.sin(t1) - Math.sin(t0)
    );
    acumulado.push(total);
  }

  const angulos: number[] = [];
  let j = 0;

  for (let k = 0; k < qtd; k++) {
    const alvo = (k / qtd) * total;
    while (j < passos && acumulado[j + 1] < alvo) j++;
    const trecho = acumulado[j + 1] - acumulado[j] || 1;
    const fracao = (alvo - acumulado[j]) / trecho;
    angulos.push(((j + fracao) / passos) * 2 * Math.PI + rotacao);
  }

  return angulos;
};

/**
 * Raio mínimo do anel para `qtd` nós de largura `largura` não se tocarem.
 *
 * O perímetro da elipse esticada (Ramanujan) é ≈ 7,76·R com stretch 1,5 e
 * `qtd·(largura + folga)` de arco é o que precisa caber. Daí o raio, com o
 * piso de 1 para nunca devolver 0.
 */
const raioDoAnel = (qtd: number, largura: number, folga: number): number => {
  if (qtd <= 1) return 0;
  return (qtd * (largura + folga)) / 7.76;
};

interface Ponto {
  x: number;
  y: number;
}

/**
 * Posições nos anéis: projetos no centro (ordem cronológica), ferramentas no
 * anel do meio (em dois anéis quando passam de 14) e tags fora.
 */
const posicoesDosAneis = (
  nodes: GraphNode[],
  visiveis: Set<string>,
  rotacao: number
): Map<string, Ponto> => {
  const pontos = new Map<string, Ponto>();

  const projetos = nodes.filter((n) => n.tipo === 'projeto' && visiveis.has(n.id));
  const ferramentas = nodes.filter((n) => n.tipo === 'ferramenta' && visiveis.has(n.id));
  const tags = nodes.filter((n) => n.tipo === 'tag' && visiveis.has(n.id));

  // Ordem cronológica: o anel conta a história no sentido horário a partir do topo.
  projetos.sort((a, b) => {
    const da = (a as ProjetoNode).data_inicio ?? '';
    const db = (b as ProjetoNode).data_inicio ?? '';
    return da.localeCompare(db);
  });

  const rProjeto = Math.max(220, raioDoAnel(projetos.length, CARTAO[0], FOLGA_CARTAO));

  // Ferramentas: um anel, ou dois quando não cabem (mesma regra do Cytoscape).
  const doisAneis = ferramentas.length > MAX_FERRAMENTAS_UM_ANEL;
  const primeiroAnel = doisAneis ? ferramentas.slice(0, MAX_FERRAMENTAS_UM_ANEL) : ferramentas;
  const segundoAnel = doisAneis ? ferramentas.slice(MAX_FERRAMENTAS_UM_ANEL) : [];

  const rFerramenta1 = rProjeto + PASSO_FERRAMENTA;
  const rFerramenta2 = rFerramenta1 + PASSO_FERRAMENTA;
  const rTag = (segundoAnel.length > 0 ? rFerramenta2 : rFerramenta1) + PASSO_TAG;

  const colocar = (lista: GraphNode[], raio: number, deslocamento = 0) => {
    if (lista.length === 0) return;
    const angulos = angulosEspacados(lista.length, X_STRETCH, rotacao + deslocamento);
    lista.forEach((no, i) => {
      const angulo = angulos[i];
      pontos.set(no.id, {
        x: raio * X_STRETCH * Math.cos(angulo),
        y: raio * Math.sin(angulo),
      });
    });
  };

  colocar(projetos, rProjeto);
  colocar(primeiroAnel, rFerramenta1);
  colocar(segundoAnel, rFerramenta2);
  // As tags ficam deslocadas meio passo: não ficam coladas atrás de uma ferramenta.
  colocar(tags, rTag, Math.PI / Math.max(1, tags.length));

  return pontos;
};

/* ----------------------------- dados e layout ----------------------------- */

/** Estado do store → o que o G6 desenha, já recortado e posicionado. */
const paraGraphData = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  visiveis: Set<string>,
  rotacao: number,
  usarAneis: boolean
): GraphData => {
  const tipoDe = new Map(nodes.map((n) => [n.id, n.tipo]));
  const pontos = usarAneis ? posicoesDosAneis(nodes, visiveis, rotacao) : new Map<string, Ponto>();

  const nos: NodeData[] = nodes
    .filter((n) => visiveis.has(n.id))
    .map((n) => {
      const ponto = pontos.get(n.id);

      if (n.tipo === 'projeto') {
        const p = n as ProjetoNode;
        return {
          id: n.id,
          type: 'html',
          data: { tipo: 'projeto', nome: p.nome },
          style: {
            size: CARTAO,
            // O contêiner HTML do G6 ancora no canto superior esquerdo: sem
            // estes deslocamentos o cartão fica meia caixa fora do lugar (a
            // composição sai do centro e corta nas bordas).
            dx: -CARTAO[0] / 2,
            dy: -CARTAO[1] / 2,
            innerHTML: cartaoHTML(p),
            cursor: 'pointer',
            ...(ponto ? { x: ponto.x, y: ponto.y } : {}),
          },
        };
      }

      if (n.tipo === 'ferramenta') {
        const f = n as FerramentaNode;
        return {
          id: n.id,
          type: 'circle',
          data: { tipo: 'ferramenta', nome: f.nome },
          style: {
            size: TAM_FERRAMENTA,
            fill: CORES.ferramenta,
            fillOpacity: 0.9,
            stroke: 'rgba(0, 217, 255, 0.28)',
            lineWidth: 7,
            cursor: 'pointer',
            ...(ponto ? { x: ponto.x, y: ponto.y } : {}),
          },
        };
      }

      const t = n as TagNode;
      return {
        id: n.id,
        type: 'diamond',
        data: { tipo: 'tag', nome: t.nome },
        style: {
          size: TAM_TAG,
          fill: CORES.tag,
          fillOpacity: 0.9,
          stroke: 'rgba(16, 185, 129, 0.3)',
          lineWidth: 6,
          cursor: 'pointer',
          ...(ponto ? { x: ponto.x, y: ponto.y } : {}),
        },
      };
    });

  const arestas = edges
    .filter((e) => visiveis.has(e.source) && visiveis.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: {
        // Aresta que toca uma tag recebe o gradiente laranja→verde.
        paraTag: tipoDe.get(e.target) === 'tag' || tipoDe.get(e.source) === 'tag',
      },
    }));

  return { nodes: nos, edges: arestas };
};

/**
 * Alternativa de força (o "CoSe Bilkent" do seletor, que é o que existe de
 * equivalente no G6). Só ela usa um layout do motor: os anéis são posições
 * calculadas por nós, passadas no dado de cada nó.
 */
const layoutDeForca = () => ({
  type: 'd3-force',
  linkDistance: 260,
  nodeStrength: -1200,
  preventOverlap: true,
  nodeSize: () =>
    [CARTAO[0], CARTAO[1]] as [number, number],
});

/* -------------------------- destaque de vizinhança ------------------------- */

const vizinhosDe = (graph: Graph, nodeId: string): Set<string> => {
  const vizinhos = new Set<string>();
  graph.getEdgeData().forEach((edge) => {
    const fonte = String(edge.source);
    const alvo = String(edge.target);
    if (fonte === nodeId) vizinhos.add(alvo);
    else if (alvo === nodeId) vizinhos.add(fonte);
  });
  return vizinhos;
};

/**
 * Cartões apagados por CSS.
 *
 * O estado `inactive` do G6 não muda a opacidade de um nó `html` (o visual dele
 * é DOM, não forma de canvas) — comprovado no navegador: 0 de 9 cartões
 * escureciam no hover. Como o cartão carrega o próprio id em `data-no`, a mesma
 * ideia é aplicada por classe.
 */
const apagarCartoes = (ativo: string, vizinhos: Set<string>): void => {
  document.querySelectorAll<HTMLElement>('.g6-card[data-no]').forEach((el) => {
    const id = el.dataset.no ?? '';
    el.classList.toggle('g6-card--apagado', !(id === ativo || vizinhos.has(id)));
  });
};

const reacenderCartoes = (): void => {
  document
    .querySelectorAll<HTMLElement>('.g6-card--apagado')
    .forEach((el) => el.classList.remove('g6-card--apagado'));
};

/** Nó em `active`, vizinhos diretos em `neighborActive`, resto em `inactive`. */
const destacar = (graph: Graph, nodeId: string): void => {
  const vizinhos = vizinhosDe(graph, nodeId);
  const estados: Record<string, string[]> = {};
  graph.getNodeData().forEach((d) => {
    const id = String(d.id);
    if (id === nodeId) estados[id] = ['active'];
    else if (vizinhos.has(id)) estados[id] = ['neighborActive'];
    else estados[id] = ['inactive'];
  });
  void graph.setElementState(estados, false);
  apagarCartoes(nodeId, vizinhos);
};

const limparDestaques = (graph: Graph): void => {
  const estados: Record<string, string[]> = {};
  graph.getNodeData().forEach((d) => {
    estados[String(d.id)] = [];
  });
  void graph.setElementState(estados, false);
  reacenderCartoes();
};

/* ------------------------------- componente ------------------------------- */

export interface GraphCanvasProps {
  onNodeSelect?: (nodeId: string | null) => void;
  searchTerm?: string;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ onNodeSelect, searchTerm }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  // Callbacks em ref: trocar o handler não deve recriar o grafo.
  const onNodeSelectRef = useRef(onNodeSelect);
  onNodeSelectRef.current = onNodeSelect;

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const viewMode = useGraphStore((s) => s.viewMode);
  const layoutType = useGraphStore((s) => s.layoutType);
  const layoutTrigger = useGraphStore((s) => s.layoutTrigger);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);

  const visiveis = useMemo(() => visibleNodeIds(nodes, edges, viewMode), [nodes, edges, viewMode]);

  /**
   * "Embaralhar" gira a composição. Determinístico (deriva do contador do
   * store), para que uma edição de nó não reposicione tudo sozinha.
   */
  const rotacao = useMemo(() => (layoutTrigger * 37 * Math.PI) / 180, [layoutTrigger]);

  const usarAneis = layoutType === 'aneis';
  const dados = useMemo(
    () => paraGraphData(nodes, edges, visiveis, rotacao, usarAneis),
    [nodes, edges, visiveis, rotacao, usarAneis]
  );

  // Os efeitos de atualização rodam depois da montagem, que já desenha o estado atual.
  const jaRenderizou = useRef(false);
  /**
   * Só mexe no grafo depois do primeiro render terminar. Chamar
   * `setElementState` com o render em voo estoura dentro do G6
   * ("Cannot read properties of undefined (reading 'draw')").
   */
  const pronto = useRef(false);
  const assinatura = useMemo(() => [...visiveis].sort().join('|'), [visiveis]);
  const assinaturaAnterior = useRef(assinatura);
  const rotacaoAnterior = useRef(rotacao);
  const selecionadoAnterior = useRef<string | null>(null);

  /* ---------------------------- criação do grafo --------------------------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cada criação é um grafo novo: o primeiro desenho volta a ser o daqui.
    jaRenderizou.current = false;
    pronto.current = false;

    const graph = new Graph({
      container,
      data: dados,
      autoFit: 'view',
      padding: 40,

      node: {
        style: {
          labelText: nomeDoNo,
          labelPlacement: 'bottom',
          labelFill: 'rgba(226, 232, 240, 0.95)',
          labelFontSize: 11,
          labelBackground: true,
          labelBackgroundFill: 'rgba(10, 10, 22, 0.72)',
          labelBackgroundRadius: 4,
          labelBackgroundPadding: [2, 5, 2, 5],
        },
        state: {
          active: { lineWidth: 8, stroke: 'rgba(255, 209, 102, 0.6)' },
          neighborActive: { lineWidth: 8, stroke: 'rgba(96, 165, 250, 0.55)' },
          inactive: { opacity: 0.16 },
          selected: { lineWidth: 8, stroke: 'rgba(255, 107, 53, 0.8)' },
        },
      },

      edge: {
        type: 'line',
        style: {
          stroke: (d: EdgeData) =>
            (d.data as { paraTag?: boolean } | undefined)?.paraTag
              ? 'l(0) 0:#FF6B35 1:#10B981'
              : 'rgba(148, 163, 184, 0.42)',
          lineWidth: (d: EdgeData) =>
            (d.data as { paraTag?: boolean } | undefined)?.paraTag ? 1.6 : 1.2,
        },
        state: {
          inactive: { strokeOpacity: 0.06 },
        },
      },

      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element', { type: 'click-select', degree: 0 }],

      // Nos anéis as posições vêm no dado; só o layout de força usa o motor.
      ...(usarAneis ? {} : { layout: layoutDeForca() }),
    });

    graphRef.current = graph;

    graph.on<IElementEvent>(NodeEvent.CLICK, (event) => {
      const id = (event.target as { id?: unknown } | undefined)?.id;
      if (id == null) return;
      const idTexto = String(id);
      if (!graph.getNodeData().some((d) => String(d.id) === idTexto)) return;
      useGraphStore.getState().selectNode(idTexto);
      onNodeSelectRef.current?.(idTexto);
    });

    graph.on<IElementEvent>(NodeEvent.POINTER_ENTER, (event) => {
      const id = (event.target as { id?: unknown } | undefined)?.id;
      if (id == null) return;
      destacar(graph, String(id));
    });

    graph.on<IElementEvent>(NodeEvent.POINTER_LEAVE, () => limparDestaques(graph));

    // Em dev o StrictMode monta duas vezes: a primeira instância é destruída com
    // o render em voo e a promise rejeita. Sem o catch, isso aparece como erro.
    void graph
      .render()
      .then(() => {
        pronto.current = true;
      })
      .catch(() => undefined);

    return () => {
      graphRef.current = null;
      graph.destroy();
    };
    // Recriar é o caminho confiável quando o layout troca: não há "layout vazio"
    // no registro do G6, e um grafo novo sempre nasce com as opções certas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usarAneis]);

  /* ----------------------- dados (visão, giro, edição) ---------------------- */
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (!jaRenderizou.current) {
      jaRenderizou.current = true;
      return;
    }

    graph.setData(dados);
    void graph
      .render()
      .then(() => {
        // Reenquadra quando o conjunto de nós muda (visão) ou quando a
        // composição girou (embaralhar) — senão o grafo encosta nas bordas.
        const mudouVisao = assinaturaAnterior.current !== assinatura;
        const girou = rotacaoAnterior.current !== rotacao;
        if (mudouVisao || girou) {
          assinaturaAnterior.current = assinatura;
          rotacaoAnterior.current = rotacao;
          void graph.fitView();
        }
      })
      .catch(() => undefined);
  }, [dados, assinatura, rotacao]);

  /* -------------------------------- seleção -------------------------------- */
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (!jaRenderizou.current || !pronto.current) return;

    const anterior = selecionadoAnterior.current;
    selecionadoAnterior.current = selectedNodeId ?? null;
    const ids = [anterior, selectedNodeId].filter((v): v is string => Boolean(v));
    if (ids.length === 0) return;

    // Estado do elemento (vale para ferramenta e tag) e contorno no cartão.
    const estados: Record<string, string[]> = {};
    const cartoes: { id: string; style: { innerHTML: string } }[] = [];

    ids.forEach((id) => {
      estados[id] = id === selectedNodeId ? ['selected'] : [];
      const no = nodes.find((n) => n.id === id);
      if (no?.tipo === 'projeto') {
        cartoes.push({
          id,
          style: { innerHTML: cartaoHTML(no as ProjetoNode, id === selectedNodeId) },
        });
      }
    });

    void graph.setElementState(estados, false);
    if (cartoes.length > 0) {
      graph.updateNodeData(cartoes);
      void graph.draw().catch(() => undefined);
    }
  }, [selectedNodeId, nodes]);

  /* ---------------------------------- busca -------------------------------- */
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (!jaRenderizou.current || !pronto.current) return;

    const termo = searchTerm?.trim().toLowerCase();
    if (!termo) {
      limparDestaques(graph);
      return;
    }

    const achado = graph.getNodeData().find((d) => nomeDoNo(d).toLowerCase().includes(termo));

    if (achado) destacar(graph, String(achado.id));
    else limparDestaques(graph);
  }, [searchTerm]);

  return <div className="graph-canvas" ref={containerRef} />;
};
