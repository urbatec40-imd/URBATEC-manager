import { useState } from 'react';
import { Search, FolderKanban } from 'lucide-react';
import type { DossierWithClient } from '@/types';
import { DomaineBadge } from '@/components/Badges';

interface GlobalSearchProps {
  dossiers: DossierWithClient[];
  onSelectDossier: (id: string) => void;
}

export function GlobalSearch({ dossiers, onSelectDossier }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const q = query.trim().toLowerCase();
  const results =
    q.length < 2
      ? []
      : dossiers.filter((d) => {
          const fields = [
            d.numero,
            d.client?.nom ?? '',
            d.telephone ?? '',
            d.reference ?? '',
            d.domaine,
            d.prestation,
          ];
          return fields.some((f) => f.toLowerCase().includes(q));
        });

  return (
    <div className="relative flex-1 max-w-md">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Rechercher: dossier, client, téléphone..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white"
        />
      </div>

      {focused && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-50">
          {results.slice(0, 10).map((d) => (
            <button
              key={d.id}
              onClick={() => {
                onSelectDossier(d.id);
                setQuery('');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sky-50 transition-colors text-left border-b border-gray-100 last:border-0"
            >
              <FolderKanban size={16} className="text-sky-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {d.numero} — {d.client?.nom ?? 'Client inconnu'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {d.prestation}
                </p>
              </div>
              <DomaineBadge domaine={d.domaine} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
