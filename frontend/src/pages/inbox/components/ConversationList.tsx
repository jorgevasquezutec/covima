import { useState } from 'react';
import { Search, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationItem } from './ConversationItem';
import type { Conversacion, ModoFiltro, ConversacionesFilters } from '../types/inbox.types';

interface ConversationListProps {
  conversaciones: Conversacion[];
  loading: boolean;
  hasMore: boolean;
  filters: ConversacionesFilters;
  selectedId: number | null;
  onSelect: (conversacion: Conversacion) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onFilterChange: (filters: Partial<ConversacionesFilters>) => void;
}

export function ConversationList({
  conversaciones,
  loading,
  hasMore,
  filters,
  selectedId,
  onSelect,
  onLoadMore,
  onRefresh,
  onFilterChange,
}: ConversationListProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search: searchInput });
  };

  const handleModoChange = (modo: string) => {
    onFilterChange({ modo: modo as ModoFiltro });
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 overflow-hidden">
      {/* Header - flex-shrink-0 para que no se comprima */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Conversaciones</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 w-8 p-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-3">
            <Select
              value={filters.modo || 'TODOS'}
              onValueChange={handleModoChange}
            >
              <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                <SelectValue placeholder="Filtrar por modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas</SelectItem>
                <SelectItem value="BOT">Bot</SelectItem>
                <SelectItem value="HANDOFF">En handoff</SelectItem>
                <SelectItem value="PAUSADO">En espera</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <Label htmlFor="misConversaciones" className="text-sm text-gray-600">
                Solo mis conversaciones
              </Label>
              <Switch
                id="misConversaciones"
                checked={filters.misConversaciones || false}
                onCheckedChange={(checked) => onFilterChange({ misConversaciones: checked })}
              />
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        {loading && conversaciones.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : conversaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No hay conversaciones</p>
          </div>
        ) : (
          <>
            {conversaciones.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversacion={conv}
                isSelected={selectedId === conv.id}
                onClick={() => onSelect(conv)}
              />
            ))}

            {hasMore && (
              <div className="p-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
