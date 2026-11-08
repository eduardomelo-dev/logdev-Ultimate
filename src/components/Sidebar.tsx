import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  GitFork,
  Radio,
  SlidersHorizontal,
  Database,
  Lightbulb,
  Plus,
} from 'lucide-react';
import { COMPONENT_METADATA } from '../engine/components';
import { useCircuitStore } from '../store/circuitStore';
import { ComponentCategory, ComponentType } from '../types/circuit';

interface CategoryConfig {
  id: ComponentCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'wiring', name: 'Fiação & Sinais', icon: GitFork },
  { id: 'gates', name: 'Portas Lógicas', icon: Radio },
  { id: 'plexers', name: 'Plexers & Decodificadores', icon: SlidersHorizontal },
  { id: 'memory', name: 'Memória & Sequencial', icon: Database },
  { id: 'io', name: 'Entradas & Saídas (I/O)', icon: Lightbulb },
];

export const Sidebar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const { setPendingComponentType } = useCircuitStore();

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleAddComponent = (type: ComponentType) => {
    setPendingComponentType(type);
  };

  const allComponents = Object.values(COMPONENT_METADATA);
  const filteredComponents = allComponents.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-64 shrink-0 min-h-0 bg-slate-900 border-r border-slate-800 flex flex-col z-10 select-none">
      {/* Search Bar */}
      <div className="shrink-0 p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar componentes..."
            aria-label="Buscar componentes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition"
          />
        </div>
      </div>

      {/* Component Library List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {searchTerm ? (
          // Search results
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-slate-500 uppercase px-2 py-1">
              Resultados da busca ({filteredComponents.length})
            </div>
            {filteredComponents.map((comp) => (
              <button
                key={comp.type}
                onClick={() => handleAddComponent(comp.type)}
                aria-label={`Adicionar ${comp.name}`}
                className="w-full text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-600 flex items-center justify-between group transition"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200 group-hover:text-white transition">
                    {comp.name}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">
                    {comp.description}
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition" />
              </button>
            ))}
            {filteredComponents.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-slate-500" role="status">
                Nenhum componente encontrado. Tente outro termo.
              </p>
            )}
          </div>
        ) : (
          // Grouped by Category
          CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isOpen = openCategories[category.id] ?? false;
            const comps = allComponents.filter((c) => c.category === category.id);

            return (
              <div key={category.id} className="rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  aria-expanded={isOpen}
                  aria-controls={`component-category-${category.id}`}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{category.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-normal text-slate-500">{comps.length}</span>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>

                <div
                  id={`component-category-${category.id}`}
                  hidden={!isOpen}
                  className="pl-6 pr-1 py-1 space-y-1"
                >
                  {comps.map((comp) => (
                    <button
                      key={comp.type}
                      onClick={() => handleAddComponent(comp.type)}
                      title={`Adicionar ${comp.name}. ${comp.description}`}
                      aria-label={`Adicionar ${comp.name}`}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-800 hover:text-white text-xs text-slate-300 flex items-center justify-between group transition border border-transparent hover:border-slate-700"
                    >
                      <span className="truncate">{comp.name}</span>
                      <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 transition" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
