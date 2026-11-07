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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    wiring: true,
    gates: true,
    plexers: false,
    memory: false,
    io: true,
  });

  const { addComponent, pan, zoom } = useCircuitStore();

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleAddComponent = (type: ComponentType) => {
    // Calculate center of visible screen in world coordinates
    const centerX = (-pan.x + window.innerWidth / 2) / zoom;
    const centerY = (-pan.y + window.innerHeight / 2) / zoom;
    const snappedX = Math.round(centerX / 20) * 20;
    const snappedY = Math.round(centerY / 20) * 20;
    addComponent(type, snappedX, snappedY);
  };

  const allComponents = Object.values(COMPONENT_METADATA);
  const filteredComponents = allComponents.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100%-3.5rem)] z-10 select-none">
      {/* Search Bar */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar componentes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {/* Component Library List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                className="w-full text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between group transition"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200 group-hover:text-cyan-400 transition">
                    {comp.name}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">
                    {comp.description}
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
              </button>
            ))}
          </div>
        ) : (
          // Grouped by Category
          CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isOpen = openCategories[category.id];
            const comps = allComponents.filter((c) => c.category === category.id);

            return (
              <div key={category.id} className="rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span>{category.name}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="pl-6 pr-1 py-1 space-y-1">
                    {comps.map((comp) => (
                      <button
                        key={comp.type}
                        onClick={() => handleAddComponent(comp.type)}
                        title={comp.description}
                        className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-800/80 hover:text-cyan-400 text-xs text-slate-300 flex items-center justify-between group transition border border-transparent hover:border-slate-700/60"
                      >
                        <span className="truncate">{comp.name}</span>
                        <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-cyan-400 transition" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
