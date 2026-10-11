import React from 'react';
import { useGraphStore, visibleNodeIds } from '../hooks/graphStore';
import './NodeCounter.css';

/**
 * Contador da legenda. Segue o recorte de visão: o painel descreve o que está
 * no canvas, não o dataset inteiro — senão diria "63" com 16 nós desenhados.
 */
export const NodeCounter: React.FC = () => {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const viewMode = useGraphStore((s) => s.viewMode);

  const visiveis = visibleNodeIds(nodes, edges, viewMode);
  const noRecorte = nodes.filter((n) => visiveis.has(n.id));

  const counts = {
    projeto: noRecorte.filter((n) => n.tipo === 'projeto').length,
    ferramenta: noRecorte.filter((n) => n.tipo === 'ferramenta').length,
    tag: noRecorte.filter((n) => n.tipo === 'tag').length,
  };

  const total = counts.projeto + counts.ferramenta + counts.tag;
  const ocultos = nodes.length - total;

  return (
    <div className="node-counter">
      <span className="node-counter-item projeto">
        <span className="node-counter-dot" style={{ background: '#FF6B35' }} />
        Projetos: {counts.projeto}
      </span>
      <span className="node-counter-item ferramenta">
        <span className="node-counter-dot" style={{ background: '#00D9FF' }} />
        Ferramentas: {counts.ferramenta}
      </span>
      {counts.tag > 0 && (
        <span className="node-counter-item tag">
          <span className="node-counter-dot" style={{ background: '#10B981' }} />
          Tags: {counts.tag}
        </span>
      )}
      <span className="node-counter-item total">
        Total: {total}
        {ocultos > 0 && <span className="node-counter-item ocultos"> (+{ocultos} ocultos)</span>}
      </span>
    </div>
  );
};
