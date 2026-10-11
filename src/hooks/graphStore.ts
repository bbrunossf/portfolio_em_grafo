import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type NodeType = 'projeto' | 'ferramenta' | 'tag';
export type ComplexityLevel = 'Baixa' | 'Média' | 'Alta';
export type LayoutType = 'aneis' | 'cose-bilkent';

/** Recorte de dados exibido no grafo. */
export type ViewMode = 'essencial' | 'completa';


export interface ProjetoNode {
  id: string;
  tipo: 'projeto';
  nome: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  ferramentas?: string[];
  tarefas?: string[];
  complexidade?: ComplexityLevel;
  conhecimentos?: string[];
  resultados?: string[];
  tags?: { nome: string; peso: number }[];
  x?: number;
  y?: number;
}

export interface FerramentaNode {
  id: string;
  tipo: 'ferramenta';
  nome: string;
  finalidade?: string;
  contexto?: string;
  x?: number;
  y?: number;
}


export interface TagNode {
  id: string;
  tipo: 'tag';
  nome: string;
  x?: number;
  y?: number;
}

export type GraphNode = ProjetoNode | FerramentaNode | TagNode;

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  tipo?: string;
}

interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  layoutTrigger: number;
  triggerLayout: () => void;
  layoutType: LayoutType;
  setLayoutType: (type: LayoutType) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;


  // Node actions
  addNode: (node: Omit<GraphNode, 'id'>) => string;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // Edge actions
  addEdge: (source: string, target: string, tipo?: string) => string;
  deleteEdge: (id: string) => void;

  // Batch operations
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;

  // Export/Import
  exportData: () => { nodes: GraphNode[]; edges: GraphEdge[] };
  importData: (data: { nodes: GraphNode[]; edges: GraphEdge[] }) => void;
  clearAll: () => void;
}

/** Uma ferramenta entra na visão essencial a partir deste nº de projetos. */
const MIN_PROJETOS_ESSENCIAL = 2;

/**
 * Ids que aparecem no grafo numa dada visão.
 *
 * `essencial` = projetos + ferramentas COMPARTILHADAS (usadas por 2+ projetos):
 * 16 dos 63 nós no dado atual. O resto é cauda longa — 31 das 38 ferramentas
 * aparecem num projeto só, e cada uma custa um rótulo disputando espaço com os
 * vizinhos do anel. As tags ficam de fora porque duplicam ferramentas (LLM e
 * Python aparecem nos dois papéis) e são a terceira dimensão que mais polui.
 */
export const visibleNodeIds = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  mode: ViewMode
): Set<string> => {
  if (mode === 'completa') return new Set(nodes.map((n) => n.id));

  const tipoDe = new Map(nodes.map((n) => [n.id, n.tipo]));
  const projetosPorNo = new Map<string, Set<string>>();

  edges.forEach((e) => {
    const tipoA = tipoDe.get(e.source);
    const tipoB = tipoDe.get(e.target);
    const projeto = tipoA === 'projeto' ? e.source : tipoB === 'projeto' ? e.target : undefined;
    const outro = tipoA === 'projeto' ? e.target : tipoB === 'projeto' ? e.source : undefined;
    if (!projeto || !outro) return;

    if (!projetosPorNo.has(outro)) projetosPorNo.set(outro, new Set());
    projetosPorNo.get(outro)!.add(projeto);
  });

  const visiveis = new Set<string>();
  nodes.forEach((n) => {
    if (n.tipo === 'projeto') {
      visiveis.add(n.id);
    } else if (
      n.tipo === 'ferramenta' &&
      (projetosPorNo.get(n.id)?.size ?? 0) >= MIN_PROJETOS_ESSENCIAL
    ) {
      visiveis.add(n.id);
    }
  });

  return visiveis;
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  layoutTrigger: 0,
  layoutType: 'aneis',
  viewMode: 'essencial',

  addNode: (node) => {
    const id = uuidv4();
    const newNode: GraphNode = { ...node, id };
    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
    return id;
  },

  updateNode: (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
    }));
  },

  deleteNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  selectNode: (id) => {
    set({ selectedNodeId: id });
  },

  addEdge: (source, target, tipo = 'relacionado') => {
    const id = uuidv4();
    const newEdge: GraphEdge = { id, source, target, tipo };
    set((state) => ({
      edges: [...state.edges, newEdge],
    }));
    return id;
  },


  deleteEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    }));
  },

  setNodes: (nodes) => {
    set({ nodes });
  },

  setEdges: (edges) => {
    set({ edges });
  },

  exportData: () => {
    const state = get();
    return {
      nodes: state.nodes,
      //edges: [] as GraphEdge[],
      edges: state.edges,
    };
  },

  importData: (data) => {
    set({
      nodes: data.nodes,
      edges: data.edges,
    });
  },

  triggerLayout: () => {
    set((state) => ({ layoutTrigger: state.layoutTrigger + 1 }));
  },

  setLayoutType: (type) => {
    set({ layoutType: type });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },


  clearAll: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
    });
  },
}));
