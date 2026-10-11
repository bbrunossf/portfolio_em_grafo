import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Link2, Download, Trash2, Wrench, Tag, Shuffle, Search, X, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ViewMode } from '../hooks/graphStore';

import { useState} from 'react';
import './Header.css';

interface HeaderProps {
  onNewNode: () => void;
  onNewRelation: () => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
  onSyncTools: () => void;
  onSyncTags: () => void;
  onShuffle: () => void;
  // searchTerm: string;
  // onSearchChange: (value: string) => void;
  onSearch: (term: string) => void;
  layoutType: string;
  onLayoutChange: (type: string) => void;
  viewMode: ViewMode;
  onToggleView: () => void;
  visiveisCount: number;
  totalCount: number;

}

export const Header: React.FC<HeaderProps> = ({
  onNewNode,
  onNewRelation,
  onExport,
  onImport,
  onClear,
  onSyncTools,
  onSyncTags,
  onShuffle,
  onSearch,
  layoutType,
  onLayoutChange,
  viewMode,
  onToggleView,
  visiveisCount,
  totalCount,

}) => {
  const [inputValue, setInputValue] = useState('');
  return (
    <header className="header">
      <div className="header-content">
        {/* Logo and Title */}
        <div className="header-title">
          <div className="logo">
            <svg viewBox="0 0 100 100" width="32" height="32">
              <circle cx="30" cy="30" r="12" fill="#FF6B35" opacity="0.9" />
              <circle cx="70" cy="30" r="12" fill="#00D9FF" opacity="0.9" />
              <circle cx="50" cy="70" r="12" fill="#9B59B6" opacity="0.9" />
              <line x1="30" y1="30" x2="70" y2="30" stroke="#D1D5DB" strokeWidth="1.5" />
              <line x1="30" y1="30" x2="50" y2="70" stroke="#D1D5DB" strokeWidth="1.5" />
              <line x1="70" y1="30" x2="50" y2="70" stroke="#D1D5DB" strokeWidth="1.5" />
            </svg>
          </div>
          <h1>Tech Project Graph</h1>
        </div>

        <div className="header-search">
          <div className="flex gap-1">
            <Input
              placeholder="Buscar nó..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch(inputValue.trim());
                }
              }}
              className="h-8 w-40 text-xs text-white placeholder:text-white/50 bg-white/10 border-white/20"
            />
            {inputValue && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setInputValue('');
                  onSearch('');
                }}
              >
                <X size={14} />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={() => onSearch(inputValue.trim())}
            >
              <Search size={14} />
            </Button>
          </div>
        </div>

        <div className="header-layout">
          <Select value={layoutType} onValueChange={onLayoutChange}>
            <SelectTrigger className="h-8 w-36 text-xs text-white bg-white/10 border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aneis">Anéis (radial)</SelectItem>
              <SelectItem value="cose-bilkent">CoSe Bilkent (força)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={onToggleView}
            size="sm"
            variant="outline"
            className="h-8 gap-2 text-xs"
            title={
              viewMode === 'essencial'
                ? `Mostrando projetos e ferramentas compartilhadas (${visiveisCount} dos ${totalCount} nós). Clique para ver tudo.`
                : `Mostrando todos os ${totalCount} nós. Clique para ver só o essencial.`
            }
          >
            <Layers size={14} />
            <span className="hidden xl:inline">
              {viewMode === 'essencial' ? `Essencial ${visiveisCount}` : `Completo ${totalCount}`}
            </span>
          </Button>
        </div>




        {/* Action Buttons */}
        <div className="header-actions">
          <Button
            onClick={onNewNode}
            size="sm"
            className="gap-2"
            title="Criar novo nó (Projeto, Ferramenta ou Conhecimento)"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Nó</span>
          </Button>

          <Button
            onClick={onNewRelation}
            size="sm"
            variant="outline"
            className="gap-2"
            title="Criar relação entre nós"
          >
            <Link2 size={16} />
            <span className="hidden sm:inline">Relação</span>
          </Button>

          <Button
            onClick={onSyncTools}
            size="sm"
            variant="outline"
            className="gap-2"
            title="Criar nós para todas as ferramentas listadas nos projetos"
          >
            <Wrench size={16} />
            <span className="hidden sm:inline">Ferramentas</span>
          </Button>

          <Button
            onClick={onSyncTags}
            size="sm"
            variant="outline"
            className="gap-2"
            title="Criar tags a partir das tarefas, conhecimentos e resultados dos projetos"
          >
            <Tag size={16} />
            <span className="hidden sm:inline">Tags</span>
          </Button>

          <Button
            onClick={onShuffle}
            size="sm"
            variant="ghost"
            className="gap-2"
            title="Reorganizar nós aleatoriamente"
          >
            <Shuffle size={16} />
          </Button>



          <Button
            onClick={onExport}
            size="sm"
            variant="outline"
            className="gap-2"
            title="Exportar dados como JSON"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </Button>

          <Button
            onClick={onImport}
            size="sm"
            variant="outline"
            className="gap-2"
            title="Importar dados de JSON"
          >
            <Download size={16} className="rotate-180" />
            <span className="hidden sm:inline">Importar</span>
          </Button>

          <Button
            onClick={onClear}
            size="sm"
            variant="destructive"
            className="gap-2"
            title="Limpar todos os dados"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
