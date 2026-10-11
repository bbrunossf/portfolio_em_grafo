import { useState, useCallback } from 'react';
import { useGraphStore, visibleNodeIds } from '../hooks/graphStore';
import { useLocalStorage } from '@/hooks/useLocalStorage';
// Canvas em G6 (branch g6-canvas). Para voltar ao Cytoscape: '@/components/GraphCanvas'
import { GraphCanvas } from '@/components/GraphCanvasG6';
import { NodePanel } from '@/components/NodePanel';
import { RelationPanel } from '@/components/RelationPanel';
import { Header } from '@/components/Header';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { NodeCounter } from '@/components/NodeCounter';

import './Home.css';

const TIPOS_VALIDOS = ['projeto', 'ferramenta', 'tag'] as const;
const TIPO_PADRAO = 'projeto';

function normalizeImportData(data: any): {
  nodes: any[];
  edges: any[];
  warnings: string[];
} | string {
  if (!data || typeof data !== 'object') {
    return 'O arquivo não contém um objeto JSON válido.';
  }
  if (!Array.isArray(data.nodes)) {
    return 'Campo "nodes" ausente ou não é um array.';
  }

  const warnings: string[] = [];
  const nodes: any[] = [];
  const rawEdges = Array.isArray(data.edges) ? data.edges : [];

  // Normaliza nós
  for (let i = 0; i < data.nodes.length; i++) {
    const src = data.nodes[i];

    // Validações obrigatórias
    if (!src.nome) {
      return `Nó #${i + 1}: campo "nome" ausente (obrigatório).`;
    }

    // Auto-preenchimento
    if (!src.id) {
      src.id = uuidv4();
      warnings.push(`Nó "${src.nome}": id gerado automaticamente → ${src.id}`);
    }
    if (!src.tipo) {
      src.tipo = TIPO_PADRAO;
      warnings.push(`Nó "${src.nome}": tipo ausente, definido como "${TIPO_PADRAO}".`);
    }
    if (src.tipo && !TIPOS_VALIDOS.includes(src.tipo)) {
      return `Nó "${src.nome}" (${src.id}): tipo "${src.tipo}" inválido. Tipos válidos: ${TIPOS_VALIDOS.join(', ')}.`;
    }

    if (src.tipo === 'ferramenta') {
      nodes.push({
        id: src.id,
        tipo: 'ferramenta',
        nome: src.nome,
        finalidade: src.finalidade ?? '',
        contexto: src.contexto ?? '',
        x: src.x ?? undefined,
        y: src.y ?? undefined,
      });
    } else if (src.tipo === 'tag') {
      nodes.push({
        id: src.id,
        tipo: 'tag',
        nome: src.nome,
        x: src.x ?? undefined,
        y: src.y ?? undefined,
      });
    } else {
      // projeto (padrão)
      nodes.push({
        id: src.id,
        tipo: 'projeto',
        nome: src.nome,
        descricao: src.descricao ?? '',
        data_inicio: src.data_inicio ?? undefined,
        data_fim: src.data_fim ?? undefined,
        ferramentas: src.ferramentas ?? [],
        tarefas: src.tarefas ?? [],
        complexidade: src.complexidade ?? undefined,
        conhecimentos: src.conhecimentos ?? [],
        resultados: src.resultados ?? [],
        tags: Array.isArray(src.tags)
          ? src.tags.map((t: any) => ({
              nome: typeof t === 'string' ? t : t.nome ?? '',
              peso: typeof t === 'object' ? (t.peso ?? 1) : 1,
            }))
          : [],

        x: src.x ?? undefined,
        y: src.y ?? undefined,
      });
    }


  }

  // Normaliza arestas
  const edges: any[] = [];
  for (let i = 0; i < rawEdges.length; i++) {
    const src = rawEdges[i];

    if (!src.source) {
      return `Aresta #${i + 1}: campo "source" ausente (obrigatório).`;
    }
    if (!src.target) {
      return `Aresta #${i + 1}: campo "target" ausente (obrigatório).`;
    }

    if (!src.id) {
      src.id = uuidv4();
      warnings.push(`Aresta ${src.source} → ${src.target}: id gerado automaticamente.`);
    }

    edges.push({
      id: src.id,
      source: src.source,
      target: src.target,
      tipo: src.tipo ?? 'relacionado',
      peso: src.peso ?? undefined,
    });
  }

  return { nodes, edges, warnings };
}


export default function Home() {
  useLocalStorage();
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);
  const [isRelationPanelOpen, setIsRelationPanelOpen] = useState(false);

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const addNode = useGraphStore((state) => state.addNode);
  const addEdge = useGraphStore((state) => state.addEdge);
  const exportData = useGraphStore((state) => state.exportData);
  const importData = useGraphStore((state) => state.importData);
  const clearAll = useGraphStore((state) => state.clearAll);
  const triggerLayout = useGraphStore((state) => state.triggerLayout);
  const [searchTerm, setSearchTerm] = useState('');

  const layoutType = useGraphStore((s) => s.layoutType);
  const setLayoutType = useGraphStore((s) => s.setLayoutType);
  const viewMode = useGraphStore((s) => s.viewMode);
  const setViewMode = useGraphStore((s) => s.setViewMode);

  // Quantos nós o recorte atual põe no canvas (o header mostra esse número)
  const visiveisCount = visibleNodeIds(nodes, edges, viewMode).size;




  const handleNewNode = useCallback(() => {
    useGraphStore.setState({ selectedNodeId: null });
    setIsNodePanelOpen(true);
  }, []);

  const handleNewRelation = useCallback(() => {
    setIsRelationPanelOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    const data = exportData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tech-graph-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Dados exportados com sucesso!');
  }, [exportData]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event: any) => {
        // 1. Parse JSON
        let data: any;
        try {
          data = JSON.parse(event.target.result);
        } catch (parseError: any) {
          toast.error(`JSON inválido: ${parseError.message}`);
          return;
        }

        // 2. Valida e normaliza (preenche ids, defaults, etc.)
        const result = normalizeImportData(data);
        if (typeof result === 'string') {
          toast.error(result);
          return;
        }

        // 3. Exibe avisos (ids gerados, tipo padrão, etc.)
        for (const warning of result.warnings) {
          toast.warning(warning);
        }

        // 4. Importa
        try {
          importData(result);
          const edgeMsg = result.edges.length > 0
            ? ` e ${result.edges.length} arestas`
            : ' (sem arestas)';
          toast.success(`Importado: ${result.nodes.length} nós${edgeMsg}.`);
        } catch (importError: any) {
          toast.error(`Erro ao aplicar dados: ${importError.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importData]);


  const handleClear = useCallback(() => {
    if (
      confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')
    ) {
      clearAll();
      toast.success('Todos os dados foram limpos');
    }
  }, [clearAll]);

  const handleSyncTools = useCallback(() => {
    const projetos = nodes.filter(
      (n): n is import('../hooks/graphStore').ProjetoNode => n.tipo === 'projeto'
    );

    if (projetos.length === 0) {
      toast.info('Nenhum nó de projeto encontrado.');
      return;
    }

    // ── Etapa 1: Coleta ferramentas únicas ──
    const ferramentasExistentes = new Map<string, string>(); // nomeLower → id
    for (const n of nodes) {
      if (n.tipo === 'ferramenta') {
        ferramentasExistentes.set(n.nome.trim().toLowerCase(), n.id);
      }
    }

    const novasFerramentas = new Set<string>();

    for (const projeto of projetos) {
      for (const nomeBruto of projeto.ferramentas ?? []) {
        const nome = nomeBruto.trim();
        if (!nome) continue;
        const key = nome.toLowerCase();
        if (!ferramentasExistentes.has(key) && !novasFerramentas.has(nome)) {
          novasFerramentas.add(nome);
        }
      }
    }

    // ── Etapa 2: Cria nós de ferramenta faltantes ──
    let criados = 0;
    for (const nome of novasFerramentas) {
      const id = addNode({ tipo: 'ferramenta', nome } as any);
      ferramentasExistentes.set(nome.toLowerCase(), id);
      criados++;
    }

    // ── Etapa 3: Cria arestas projeto ↔ ferramenta ──
    const arestasExistentes = new Set<string>();
    for (const edge of edges) {
      // Chave composta para detectar duplicatas
      arestasExistentes.add(`${edge.source}||${edge.target}`);
    }

    let arestasCriadas = 0;
    for (const projeto of projetos) {
      for (const nomeBruto of projeto.ferramentas ?? []) {
        const nome = nomeBruto.trim();
        if (!nome) continue;
        const ferramentaId = ferramentasExistentes.get(nome.toLowerCase());
        if (!ferramentaId) continue;

        const chave = `${projeto.id}||${ferramentaId}`;
        if (!arestasExistentes.has(chave)) {
          addEdge(projeto.id, ferramentaId);
          arestasExistentes.add(chave);
          arestasCriadas++;
        }
      }
    }

    // ── Resultado ──
    const partes: string[] = [];
    if (criados > 0) partes.push(`${criados} nó(s) de ferramenta`);
    if (arestasCriadas > 0) partes.push(`${arestasCriadas} aresta(s)`);

    if (partes.length === 0) {
      toast.info('Tudo já está sincronizado — nenhuma novidade.');
    } else {
      toast.success(`Sincronizado: ${partes.join(' e ')} criado(s).`);
    }
  }, [nodes, edges, addNode, addEdge]);

  const handleSyncTags = useCallback(() => {
    const projetos = nodes.filter(
      (n): n is import('../hooks/graphStore').ProjetoNode => n.tipo === 'projeto'
    );

    if (projetos.length === 0) {
      toast.info('Nenhum nó de projeto encontrado.');
      return;
    }

    const tagsExistentes = new Map<string, string>();
    for (const n of nodes) {
      if (n.tipo === 'tag') {
        tagsExistentes.set(n.nome.trim().toLowerCase(), n.id);
      }
    }

    // Cria nós tag faltantes
    const novasTags = new Map<string, string>(); // nome → id
    for (const projeto of projetos) {
      for (const tag of projeto.tags ?? []) {
        const nome = tag.nome.trim();
        if (!nome) continue;
        const key = nome.toLowerCase();
        if (!tagsExistentes.has(key) && !novasTags.has(key)) {
          const id = addNode({ tipo: 'tag', nome } as any);
          tagsExistentes.set(key, id);
          novasTags.set(key, id);
        }
      }
    }

    // Cria arestas projeto ↔ tag
    const arestasExistentes = new Set<string>();
    for (const edge of edges) {
      arestasExistentes.add(`${edge.source}||${edge.target}`);
    }

    let arestasCriadas = 0;
    for (const projeto of projetos) {
      for (const tag of projeto.tags ?? []) {
        const nome = tag.nome.trim();
        if (!nome) continue;
        const tagId = tagsExistentes.get(nome.toLowerCase());
        if (!tagId) continue;

        const chave = `${projeto.id}||${tagId}`;
        if (!arestasExistentes.has(chave)) {
          addEdge(projeto.id, tagId);
          arestasExistentes.add(chave);
          arestasCriadas++;
        }
      }
    }

    const partes: string[] = [];
    if (novasTags.size > 0) partes.push(`${novasTags.size} tag(s)`);
    if (arestasCriadas > 0) partes.push(`${arestasCriadas} aresta(s)`);

    if (partes.length === 0) {
      toast.info('Todas as tags já estão sincronizadas.');
    } else {
      toast.success(`Sincronizado: ${partes.join(' e ')} criado(s).`);
    }
  }, [nodes, edges, addNode, addEdge]);


  const handleShuffle = useCallback(() => {
    triggerLayout();
    toast('Nós reorganizados! 🔀');
  }, [triggerLayout]);

  const handleSearch = useCallback((term: string) => {
     setSearchTerm(term);
   }, []);


  return (
    <div className="home-container">
      <Header
        onNewNode={handleNewNode}
        onNewRelation={handleNewRelation}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        onSyncTools={handleSyncTools}
        onSyncTags={handleSyncTags}
        onShuffle={handleShuffle}
        onSearch={handleSearch}
        layoutType={layoutType}
        onLayoutChange={(type) => setLayoutType(type as any)}
        viewMode={viewMode}
        onToggleView={() => setViewMode(viewMode === 'essencial' ? 'completa' : 'essencial')}
        visiveisCount={visiveisCount}
        totalCount={nodes.length}
      />

      <div className="graph-container">
        <NodeCounter />
        <GraphCanvas
          searchTerm={searchTerm}
          onNodeSelect={(nodeId) => {
            if (nodeId) {
              setIsNodePanelOpen(true);
            }
          }}
        />
      </div>

      <NodePanel isOpen={isNodePanelOpen} onClose={() => setIsNodePanelOpen(false)} />
      <RelationPanel isOpen={isRelationPanelOpen} onClose={() => setIsRelationPanelOpen(false)} />
    </div>
  );
}
