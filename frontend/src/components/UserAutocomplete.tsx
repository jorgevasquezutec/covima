import { useState, useRef } from 'react';
import { Check, ChevronsUpDown, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import type { UsuarioSimple } from '@/types';

interface UserAutocompleteProps {
    usuarios: UsuarioSimple[];
    selectedIds: number[];
    onSelect: (usuarioId: number) => void;
    onAddFreeText?: (nombre: string) => void;
    placeholder?: string;
    allowFreeText?: boolean;
}

export default function UserAutocomplete({
    usuarios,
    selectedIds,
    onSelect,
    onAddFreeText,
    placeholder = 'Buscar participante...',
    allowFreeText = true,
}: UserAutocompleteProps) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const availableUsuarios = usuarios.filter(u => !selectedIds.includes(u.id));

    const filteredUsuarios = searchValue
        ? availableUsuarios.filter(u =>
            u.nombre.toLowerCase().includes(searchValue.toLowerCase())
        )
        : availableUsuarios;

    const canAddFreeText = allowFreeText && searchValue.trim().length > 0 && filteredUsuarios.length === 0;

    const handleAddFreeText = () => {
        if (onAddFreeText && searchValue.trim()) {
            onAddFreeText(searchValue.trim());
            setSearchValue('');
            setOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && canAddFreeText) {
            e.preventDefault();
            handleAddFreeText();
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full sm:w-64 justify-between bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                    <span className="flex items-center gap-2 text-gray-500">
                        <Search className="h-4 w-4" />
                        {placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-64 p-0 bg-white border-gray-200" align="start">
                <Command className="bg-white" shouldFilter={false}>
                    <CommandInput
                        ref={inputRef}
                        placeholder="Escribe para buscar..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        onKeyDown={handleKeyDown}
                        className="border-none focus:ring-0"
                    />
                    <CommandList>
                        {filteredUsuarios.length === 0 && !canAddFreeText && (
                            <CommandEmpty>No se encontraron participantes.</CommandEmpty>
                        )}
                        {canAddFreeText && (
                            <CommandGroup heading="Agregar como nombre libre">
                                <CommandItem
                                    value={`add-free-${searchValue}`}
                                    onSelect={handleAddFreeText}
                                    className="cursor-pointer text-blue-600"
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Agregar "{searchValue}" (no registrado)
                                </CommandItem>
                            </CommandGroup>
                        )}
                        {filteredUsuarios.length > 0 && (
                            <CommandGroup heading="Usuarios registrados" className="max-h-60 overflow-y-auto">
                                {filteredUsuarios.map((usuario) => (
                                    <CommandItem
                                        key={usuario.id}
                                        value={usuario.nombre}
                                        onSelect={() => {
                                            onSelect(usuario.id);
                                            setOpen(false);
                                            setSearchValue('');
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                selectedIds.includes(usuario.id) ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        {usuario.nombre}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
