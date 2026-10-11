import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import {
  useGraphStore,
  visibleNodeIds,
  NodeType,
  ProjetoNode,
} from '../hooks/graphStore';
import type { LayoutType } from '../hooks/graphStore';
import './GraphCanvas.css';

cytoscape.use(coseBilkent);

const getNodeColor = (tipo: NodeType) => {
  switch (tipo) {
    case 'projeto':
      return '#FF6B35';
    case 'ferramenta':
      return '#00D9FF';
    case 'tag':
      return '#10B981';
    default:
      return '#888888';
  }
};

/** Enquadramento */
const FIT_PADDING = 28;
/** Teto do zoom no enquadramento — evita "encher" a tela quando há 3 nós. */
const FIT_MAX_ZOOM = 1.5;

/**
 * Raios dos anéis, em coordenadas de modelo.
 *
 * Estes números são o orçamento visual inteiro: quanto maior o raio externo,
 * menor o zoom do enquadramento e menor o rótulo na tela. Com 380 no anel de
 * tags o fit fica em ~0,9; era 0,47 com os 432/654 anteriores.
 */
const RAIO_PROJETO = 175;

/** Acima disso as ferramentas não cabem num anel só: sobraria menos que o rótulo. */
const MAX_FERRAMENTAS_UM_ANEL = 14;

/**
 * Raios dos anéis para um dado recorte de dados.
 *
 * Estes números são o orçamento visual inteiro: quanto maior o raio externo,
 * menor o zoom do enquadramento e menor o rótulo na tela. Com os 63 nós da
 * visão completa o fit fica em ~0,92; com os 16 da visão essencial o anel
 * externo cai para 255 e o enquadramento bate no teto.
 */
const aneisDe = (qtdFerramentas: number, qtdTags: number) => ({
  projeto: RAIO_PROJETO,
  ferramenta:
    qtdFerramentas <= MAX_FERRAMENTAS_UM_ANEL && qtdTags === 0 ? [255] : [250, 315],
  tag: qtdTags > 0 ? 380 : null,
});

type Aneis = ReturnType<typeof aneisDe>;


/**
 * Esticamento horizontal dos anéis.
 *
 * Um círculo num canvas largo (1600×827) usa só ~52% da largura e deixa duas
 * faixas mortas nas laterais. Esticando o eixo X os anéis viram elipses, o
 * grafo ocupa a tela e os nós ganham separação horizontal — que é justamente
 * onde os rótulos colidem. O enquadramento continua limitado pela altura, então
 * o zoom não cai.
 */
const X_STRETCH = 1.45;

/**
 * Ângulos que dividem a elipse em arcos de MESMO COMPRIMENTO.
 *
 * Numa elipse, passos iguais no parâmetro andam mais devagar nas pontas
 * esquerda/direita e mais rápido no topo/base — ou seja, os nós ficavam
 * amontoados justamente nas laterais, que é onde os rótulos colidiam. Aqui a
 * divisão é por comprimento de arco (integrado numericamente), então o
 * espaçamento fica uniforme em volta do anel.
 */
const angulosEspacados = (qtd: number, stretch: number): number[] => {
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
    angulos.push(((j + fracao) / passos) * 2 * Math.PI);
  }

  return angulos;
};

const posicionar = (
  node: any,
  center: { x: number; y: number },
  raio: number,
  angulo: number
) => {
  node.position({
    x: center.x + raio * X_STRETCH * Math.cos(angulo),
    y: center.y + raio * Math.sin(angulo),
  });
};

interface GraphCanvasProps {
  onNodeSelect?: (nodeId: string | null) => void;
  searchTerm?: string;
}

/* ───────────────────────── composição radial ───────────────────────── */

/**
 * Centro em coordenadas de MODELO, tirado do bounding box.
 *
 * A versão anterior usava `cy.width() / 2` (pixels de tela), que só coincide
 * com o centro do grafo quando o usuário não mexeu no pan/zoom — qualquer
 * arrasto deslocava a composição inteira.
 */
const modelCenter = (cy: any) => {
  const bb = cy.nodes().boundingBox();
  return { x: (bb.x1 + bb.x2) / 2, y: (bb.y1 + bb.y2) / 2 };
};

/**
 * Projetos num anel, em ordem cronológica e no sentido horário.
 *
 * (Aqui existiu uma espiral: o raio crescia a cada projeto. A ideia era
 * comunicar a passagem do tempo, mas visualmente virava um caracol desalinhado
 * com os outros anéis. O anel mantém a ordem cronológica e fica coerente com o
 * resto da composição.)
 *
 * `deslocamento` gira a ORDEM (qual projeto começa o anel), não a geometria —
 * girar a elipse a deixaria de pé num canvas largo.
 */
function ringProjects(
  cy: any,
  center: { x: number; y: number },
  deslocamento: number,
  aneis: Aneis
) {
  const projetos = cy
    .nodes('[tipo="projeto"]')
    .sort((a: any, b: any) =>
      (a.data('data_inicio') || '').localeCompare(b.data('data_inicio') || '')
    );

  if (projetos.length === 0) return;

  const base = angulosEspacados(projetos.length, X_STRETCH);

  projetos.forEach((node: any, i: number) => {
    posicionar(node, center, aneis.projeto, base[(i + deslocamento) % base.length]);
  });
}

/**
 * Ferramentas e tags em anéis externos, preservando o ângulo que o layout base
 * deu para cada nó (é o layout base que decide a ordem em volta do círculo).
 */
function outerRings(
  cy: any,
  center: { x: number; y: number },
  aneis: Aneis,
  deslocamento: number
) {
  const porAngulo = (tipo: string) =>
    cy
      .nodes(`[tipo="${tipo}"]`)
      .map((node: any) => {
        const p = node.position();
        return { node, angulo: Math.atan2(p.y - center.y, p.x - center.x) };
      })
      .sort((a: any, b: any) => a.angulo - b.angulo);

  const aneisFerramenta = aneis.ferramenta;
  const ferramentas = porAngulo('ferramenta');

  // Cada anel é dividido por comprimento de arco (não pelo espaçamento que veio
  // do layout base), então os nós ficam equidistantes ao longo da elipse.
  aneisFerramenta.forEach((raio: number, indiceAnel: number) => {
    const doAnel = ferramentas.filter(
      (_item: any, i: number) => i % aneisFerramenta.length === indiceAnel
    );
    const base = angulosEspacados(doAnel.length, X_STRETCH);

    doAnel.forEach((item: any, i: number) => {
      posicionar(item.node, center, raio, base[(i + deslocamento) % base.length]);
    });
  });

  const raioTag = aneis.tag;
  if (raioTag !== null) {
    const tags = porAngulo('tag');
    const base = angulosEspacados(tags.length, X_STRETCH);

    tags.forEach((item: any, i: number) => {
      posicionar(item.node, center, raioTag, base[(i + deslocamento) % base.length]);
    });
  }
}

/** Projetos no anel interno + ferramentas e tags nos anéis externos. */
function composeRadial(cy: any, deslocamento: number, aneis: Aneis) {
  const center = modelCenter(cy);
  ringProjects(cy, center, deslocamento, aneis);
  outerRings(cy, center, aneis, deslocamento);
}

/* ────────────────────────────── layouts ────────────────────────────── */

const byTipo = (node: any) => {
  switch (node.data('tipo')) {
    case 'projeto':
      return 100;
    case 'ferramenta':
      return 50;
    default:
      return 10;
  }
};

const byDataInicio = (a: any, b: any) =>
  (a.data('data_inicio') || '').localeCompare(b.data('data_inicio') || '');

function buildLayoutConfig(type: LayoutType, shuffle: boolean): any {
  // `fit: false` de propósito: o enquadramento acontece no `layoutstop`,
  // depois da composição. Fazer o fit antes deixava a visão enquadrando
  // posições intermediárias.
  const base: any = {
    animate: true,
    animationDuration: 500,
    fit: false,
    padding: FIT_PADDING,
  };

  switch (type) {
    case 'aneis':
      // O concêntrico aqui só define a ORDEM dos nós em volta do círculo e os
      // ângulos de partida; as posições finais vêm do composeRadial().
      return {
        ...base,
        name: 'concentric',
        concentric: byTipo,
        levelWidth: () => 1,
        minNodeSpacing: 40,
        startAngle: Math.PI / 2,
        clockwise: true,
        sort: byDataInicio,
      };

    case 'cose-bilkent':
      return {
        ...base,
        name: 'cose-bilkent',
        idealEdgeLength: 110,
        nodeRepulsion: 9000,
        gravity: 0.15,
        numIter: 2500,
        randomize: shuffle,
        nodeDimensionsIncludeLabels: true,
      };

    default:
      return { ...base, name: 'concentric', concentric: byTipo, minNodeSpacing: 40 };
  }
}

/* ───────────────────────────── componente ───────────────────────────── */

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ onNodeSelect, searchTerm }) => {
  const cyRef = useRef<any>(null);

  // Refs estáveis para callbacks — evita que handleCyInit mude de referência
  const onNodeSelectRef = useRef(onNodeSelect);
  onNodeSelectRef.current = onNodeSelect;
  const selectNodeRef = useRef(useGraphStore.getState().selectNode);
  const updateNodeRef = useRef(useGraphStore.getState().updateNode);

  const layoutTrigger = useGraphStore((state) => state.layoutTrigger);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectNode = useGraphStore((state) => state.selectNode);
  const updateNode = useGraphStore((state) => state.updateNode);
  const layoutType = useGraphStore((state) => state.layoutType);
  const viewMode = useGraphStore((state) => state.viewMode);

  selectNodeRef.current = selectNode;
  updateNodeRef.current = updateNode;

  // Recorte visível (essencial x completa) e os raios de anel que combinam
  // com ele — menos nós pedem menos anéis, o que sobe o zoom do enquadramento.
  const visiveis = useMemo(
    () => visibleNodeIds(nodes, edges, viewMode),
    [nodes, edges, viewMode]
  );

  const aneis = useMemo(() => {
    const qtd = (tipo: string) =>
      nodes.filter((n) => visiveis.has(n.id) && n.tipo === tipo).length;
    return aneisDe(qtd('ferramenta'), qtd('tag'));
  }, [nodes, visiveis]);

  // runAndSaveLayout é um useCallback com deps [] de propósito (é chamado de
  // dentro de callbacks antigos do cytoscape), então lê os raios por ref.
  const aneisRef = useRef(aneis);
  aneisRef.current = aneis;

  /**
   * Build Cytoscape elements — posições vão em `position`, não em `data`.
   *
   * Nas arestas o nó de PROJETO é sempre a origem. O dado original ora traz
   * projeto→tag, ora tag→projeto; normalizar aqui (a) deixa o gradiente
   * sempre correndo de projeto para tag e (b) mantém o hover consistente.
   */
  const elements = useMemo(() => {
    const tipoDe = new Map(nodes.map((n) => [n.id, n.tipo]));
    const aparece = (id: string) => visiveis.has(id);

    return [
      ...nodes.filter((node) => aparece(node.id)).map((node) => ({
        data: {
          id: node.id,
          label: node.nome,
          tipo: node.tipo,
          data_inicio:
            node.tipo === 'projeto' ? (node as ProjetoNode).data_inicio : undefined,
        },
        position:
          node.x != null && node.y != null ? { x: node.x, y: node.y } : undefined,
      })),
      ...edges.filter((edge) => aparece(edge.source) && aparece(edge.target)).map((edge) => {
        const tipoSrc = tipoDe.get(edge.source);
        const tipoTgt = tipoDe.get(edge.target);

        // Garante que a origem seja o projeto quando houver um
        const inverter =
          tipoSrc !== 'projeto' && tipoTgt === 'projeto';

        const origemId = inverter ? edge.target : edge.source;
        const destinoId = inverter ? edge.source : edge.target;
        const origem = nodes.find((n) => n.id === origemId);
        const destino = nodes.find((n) => n.id === destinoId);

        const data: any = {
          id: edge.id,
          source: origemId,
          target: destinoId,
        };

        if (destino?.tipo === 'ferramenta') {
          data.tipo_relacao = 'ferramenta';
        } else if (destino?.tipo === 'tag') {
          data.tipo_relacao = 'tag';
          const tagEntry = (origem as ProjetoNode)?.tags?.find(
            (t) => t.nome.toLowerCase() === destino.nome.toLowerCase()
          );
          if (tagEntry) data.peso = tagEntry.peso;
        }

        return { data };
      }),
    ];
  }, [nodes, edges, visiveis]);

  const stylesheet = useMemo(
    () => [
      /* ── Nós ────────────────────────────────────────────────────────── */
      {
        selector: 'node',
        style: {
          'background-color': (ele: any) => getNodeColor(ele.data('tipo')),
          // Antes 0.3: a paleta do README estava lá, mas quase transparente
          // sobre o fundo escuro — o grafo parecia apagado.
          'background-opacity': 0.92,
          'border-width': 2,
          'border-color': (ele: any) => getNodeColor(ele.data('tipo')),
          'border-opacity': 0.4,
          label: 'data(label)',
          color: '#EAF0F7',
          'font-size': 13,
          'font-weight': 500,
          'text-wrap': 'wrap',
          'text-overflow-wrap': 'whitespace',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': 5,
          // Halo de verdade atrás do texto (antes: preto com opacidade 0.15)
          'text-background-color': '#0F0F1E',
          'text-background-opacity': 0.85,
          'text-background-padding': '3px',
          'text-background-shape': 'roundrectangle',
          // Anti-label-soup: o rótulo some quando encolhe abaixo disso.
          // Sobrescrito por tipo logo abaixo.
          'min-zoomed-font-size': 9,
          'transition-property': 'background-color, border-color, opacity',
          'transition-duration': '150ms',
        },
      },
      {
        selector: 'node[tipo="projeto"]',
        style: {
          shape: 'ellipse',
          width: 58,
          height: 58,
          'font-size': 14,
          'font-weight': 600,
          'text-max-width': '120px',
          // Projeto é o conteúdo: sempre rotulado, em qualquer zoom.
          'min-zoomed-font-size': 0,
        },
      },
      {
        selector: 'node[tipo="ferramenta"]',
        style: {
          shape: 'ellipse',
          width: 34,
          height: 34,
          'font-size': 12,
          // 90px em vez de 110px: o rótulo quebra em duas linhas em vez de
          // invadir o vizinho do anel.
          'text-max-width': '90px',
          'min-zoomed-font-size': 9,
        },
      },
      {
        selector: 'node[tipo="tag"]',
        style: {
          shape: 'diamond',
          width: 26,
          height: 26,
          'font-size': 12,
          'text-max-width': '95px',
          'min-zoomed-font-size': 9,
        },
      },
      {
        selector: 'node:selected',
        style: {
          'border-color': '#FFD700',
          'border-width': 4,
          'border-opacity': 1,
          'background-opacity': 1,
        },
      },
      {
        selector: 'node.search-hit',
        style: {
          'border-color': '#FFD700',
          'border-width': 4,
          'border-opacity': 1,
          'background-opacity': 1,
        },
      },

      /* ── Arestas ────────────────────────────────────────────────────── */
      {
        selector: 'edge',
        style: {
          // Retas: num arranjo radial elas saem do centro para fora, o que dá
          // para seguir com o olho. E, ao contrário do bezier, não inflam o
          // bounding box no fit (era parte do motivo do zoom baixo).
          'curve-style': 'straight',
          'line-color': '#8C97AC',
          // 77 arestas em cor cheia engolem o grafo; em repouso elas são só
          // um fio de contexto e ganham cor no foco (edge-active).
          width: 0.8,
          opacity: 0.16,
          'transition-property': 'opacity, line-color, width',
          'transition-duration': '150ms',
        },
      },
      {
        selector: 'edge[tipo_relacao="ferramenta"]',
        style: {
          'line-color': '#00D9FF',
        },
      },
      {
        // Linha de relação com tag: gradiente do laranja do projeto até o
        // verde da tag. Comunica a relação pela própria cor em vez de só
        // tracejar (que com 23 linhas virava textura).
        selector: 'edge[tipo_relacao="tag"]',
        style: {
          'line-fill': 'linear-gradient',
          'line-gradient-stop-colors': ['#FF6B35', '#10B981'],
          'line-gradient-stop-positions': [0, 1],
          'line-style': 'solid',
        },
      },
      // Arestas do nó em foco (hover ou resultado de busca)
      {
        selector: 'edge.edge-active',
        style: {
          opacity: 0.95,
          width: (ele: any) => {
            const peso = ele.data('peso');
            return peso ? Math.max(1.6, peso * 1.6) : 2;
          },
        },
      },

      /* ── Realce ─────────────────────────────────────────────────────── */
      {
        selector: '.faded',
        // `opacity` já apaga o rótulo junto, não precisa de text-opacity
        style: {
          opacity: 0.12,
        },
      },
    ],
    []
  );

  /* ── Helper: roda layout, compõe, enquadra e salva posições ── */
  const runAndSaveLayout = useCallback((cy: any, type: LayoutType, shuffle: boolean) => {
    const layout = cy.layout(buildLayoutConfig(type, shuffle));

    layout.on('layoutstop', () => {
      // A composição radial é exclusiva do layout "aneis". Antes ela rodava
      // depois de QUALQUER layout, então o seletor do header não tinha efeito
      // nenhum — os outros layouts só mudavam os ângulos.
      if (type === 'aneis') {
        // "Embaralhar" desloca a ORDEM dos nós no anel; girar a geometria
        // deixaria a elipse de pé e desperdiçaria a largura da tela.
        composeRadial(cy, shuffle ? Math.floor(Math.random() * 1000) : 0, aneisRef.current);
      }

      // Fit só agora, com as posições finais — e só dos nós, porque enquadrar
      // as arestas fazia os pontos de controle inflarem o enquadramento.
      const alvo = cy.nodes().length ? cy.nodes() : undefined;
      cy.fit(alvo, FIT_PADDING);
      if (cy.zoom() > FIT_MAX_ZOOM) {
        cy.zoom({
          level: FIT_MAX_ZOOM,
          renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
        });
      }

      cy.nodes().forEach((node: any) => {
        const pos = node.position();
        updateNodeRef.current(node.id(), { x: pos.x, y: pos.y });
      });
    });

    layout.run();
  }, []);

  const handleCyInit = useCallback(
    (cy: any) => {
      // Se é a mesma instância, ignora — evita reexecução em re-renders
      if (cyRef.current === cy) return;
      cyRef.current = cy;

      // Em dev o grafo fica exposto no console: cy.nodes(), cy.zoom(),
      // cy.fit() e companhia são o jeito prático de inspecionar um canvas,
      // que o DevTools não mostra no DOM.
      if (import.meta.env.DEV) (window as any).__cy = cy;

      // Highlight — conectados em foco, resto esmaecido
      cy.on('mouseover', 'node', (evt: any) => {
        const connected = evt.target.closedNeighborhood();
        const connectedEdges = connected.edges();
        cy.elements().difference(connected).addClass('faded');
        connected.removeClass('faded');
        cy.edges().not(connectedEdges).removeClass('edge-active');
        connectedEdges.addClass('edge-active').removeClass('faded');
      });

      cy.on('mouseout', 'node', () => {
        cy.elements().removeClass('faded');
        cy.edges().removeClass('edge-active');
      });

      // Node click
      cy.on('tap', 'node', (evt: any) => {
        const nodeId = evt.target.id();
        selectNodeRef.current(nodeId);
        onNodeSelectRef.current?.(nodeId);
      });

      // Node drag
      cy.on('dragfree', 'node', (evt: any) => {
        const nodeId = evt.target.id();
        const pos = evt.target.position();
        updateNodeRef.current(nodeId, { x: pos.x, y: pos.y });
      });

      // Layout inicial
      runAndSaveLayout(cy, useGraphStore.getState().layoutType, true);
    },
    [runAndSaveLayout]
  );

  // Update selected state
  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.elements().unselect();
    if (selectedNodeId) cyRef.current.getElementById(selectedNodeId).select();
  }, [selectedNodeId]);

  // Layout manual (botão "Embaralhar")
  useEffect(() => {
    if (!cyRef.current || layoutTrigger === 0) return;
    const timer = setTimeout(() => {
      if (!cyRef.current) return;
      runAndSaveLayout(cyRef.current, useGraphStore.getState().layoutType, true);
    }, 100);
    return () => clearTimeout(timer);
  }, [layoutTrigger, runAndSaveLayout]);

  // Realce de busca
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('faded search-hit');
    cy.edges().removeClass('edge-active');

    const term = searchTerm?.trim();
    if (!term) return;

    const lower = term.toLowerCase();
    const matched = cy.nodes().filter((n: any) => n.data('label').toLowerCase().includes(lower));
    if (matched.length === 0) return;

    cy.elements().addClass('faded');
    matched.removeClass('faded').addClass('search-hit');
    matched.connectedEdges().removeClass('faded').addClass('edge-active');
    matched.neighborhood().removeClass('faded');
  }, [searchTerm]);

  // Reexecuta o layout quando novos nós são adicionados
  const prevNodeCountRef = useRef(nodes.length);
  useEffect(() => {
    if (!cyRef.current) return;

    const prev = prevNodeCountRef.current;
    prevNodeCountRef.current = nodes.length;

    // Ignora montagem inicial (prev=0) e remoções
    if (nodes.length <= prev) return;

    const timer = setTimeout(() => {
      if (!cyRef.current) return;
      runAndSaveLayout(cyRef.current, useGraphStore.getState().layoutType, false);
    }, 150);
    return () => clearTimeout(timer);
  }, [nodes.length, runAndSaveLayout]);

  // Troca de layout
  const prevLayoutRef = useRef(layoutType);
  useEffect(() => {
    if (!cyRef.current) return;
    if (prevLayoutRef.current === layoutType) return;
    prevLayoutRef.current = layoutType;
    const timer = setTimeout(() => {
      if (!cyRef.current) return;
      runAndSaveLayout(cyRef.current, layoutType, true);
    }, 100);
    return () => clearTimeout(timer);
  }, [layoutType, runAndSaveLayout]);

  // Troca de visão (essencial x completa): os elementos mudam, então os anéis
  // precisam ser recalculados para o novo conjunto — 16 nós pedem um anel
  // externo só, e é isso que faz a fonte ficar grande.
  const prevViewRef = useRef(viewMode);
  useEffect(() => {
    if (!cyRef.current) return;
    if (prevViewRef.current === viewMode) return;
    prevViewRef.current = viewMode;
    const timer = setTimeout(() => {
      if (!cyRef.current) return;
      runAndSaveLayout(cyRef.current, useGraphStore.getState().layoutType, true);
    }, 140);
    return () => clearTimeout(timer);
  }, [viewMode, runAndSaveLayout]);

  return (
    <div className="graph-canvas">
      <CytoscapeComponent
        cytoscape={cytoscape}
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        cy={handleCyInit}
        userZoomingEnabled={true}
        minZoom={0.45}
        maxZoom={2.8}
        boxSelectionEnabled={false}
      />
    </div>
  );
};
