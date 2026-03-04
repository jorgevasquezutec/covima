import { useState, useMemo, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, X, Loader2, Check, UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DynamicForm } from '@/components/asistencia/DynamicForm';
import { asistenciaApi } from '@/services/api';
import { PuertaQuickRegister } from './PuertaQuickRegister';
import type { Usuario, QRAsistencia } from '@/types';

interface PuertaMemberSearchProps {
  usuarios: Usuario[];
  qr: QRAsistencia | null;
  isOutOfTime?: boolean;
  registrosOtrosProgramas?: Map<number, string[]>;
  onSuccess: (nombre: string, tipo: 'asistencia' | 'nuevo_miembro') => void;
  onNewUser: (user: Usuario) => void;
}

function shortenProgramTitle(titulo: string): string {
  const lower = titulo.toLowerCase();
  if (lower.includes('escuela sab')) return 'Esc. Sab.';
  if (lower.includes('culto divino')) return 'C. Divino';
  if (lower.includes('programa ja')) return 'Prog. JA';
  if (titulo.length > 12) return titulo.slice(0, 10) + '…';
  return titulo;
}

export function PuertaMemberSearch({
  usuarios,
  qr,
  isOutOfTime = false,
  registrosOtrosProgramas = new Map(),
  onSuccess,
  onNewUser,
}: PuertaMemberSearchProps) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setSearch('');
    setSelectedUser(null);
    setShowQuickRegister(false);
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return usuarios
      .filter((u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.telefono.includes(q)
      )
      .slice(0, 20);
  }, [search, usuarios]);

  // Build list of users registered in other programs (for chips)
  const otrosProgramasUsers = useMemo(() => {
    if (registrosOtrosProgramas.size === 0) return [];
    const result: { usuario: Usuario; programas: string[] }[] = [];
    for (const [uid, programas] of registrosOtrosProgramas) {
      const u = usuarios.find((usr) => usr.id === uid);
      if (u) result.push({ usuario: u, programas });
    }
    return result.sort((a, b) => a.usuario.nombre.localeCompare(b.usuario.nombre));
  }, [registrosOtrosProgramas, usuarios]);

  const soloPresencia = qr?.tipoAsistencia?.soloPresencia ?? true;
  const campos = qr?.tipoAsistencia?.campos ?? [];

  const registerMutation = useMutation({
    mutationFn: (datosFormulario?: Record<string, unknown>) =>
      asistenciaApi.registrarManual({
        codigoQR: qr!.codigo,
        usuarioId: selectedUser!.id,
        datosFormulario,
      }),
    onSuccess: () => {
      onSuccess(selectedUser!.nombre, 'asistencia');
      resetState();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al registrar asistencia';
      toast.error(typeof msg === 'string' ? msg : msg[0]);
    },
  });

  const submitLabel = isOutOfTime ? 'Guardar datos' : 'Registrar Asistencia';

  // User selected → show confirm + optional dynamic form
  if (selectedUser) {
    return (
      <div className="space-y-4">
        {/* Out-of-time banner */}
        {isOutOfTime && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Fuera de horario — se guardarán los datos sin marcar asistencia</span>
          </div>
        )}

        {/* Selected user chip */}
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <Check className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{selectedUser.nombre}</p>
            <p className="text-sm text-gray-500">+{selectedUser.codigoPais} {selectedUser.telefono}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={resetState}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Dynamic form or direct register */}
        {!soloPresencia && campos.length > 0 ? (
          <DynamicForm
            campos={campos}
            onSubmit={(data) => registerMutation.mutate(data)}
            isSubmitting={registerMutation.isPending}
            submitLabel={submitLabel}
            size="lg"
          />
        ) : (
          <Button
            className={`w-full h-14 text-base ${isOutOfTime ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
            disabled={registerMutation.isPending}
            onClick={() => registerMutation.mutate(undefined)}
          >
            {registerMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Check className="w-5 h-5 mr-2" />
            )}
            {submitLabel}
          </Button>
        )}
      </div>
    );
  }

  // Quick register mode
  if (showQuickRegister) {
    return (
      <PuertaQuickRegister
        qr={qr}
        isOutOfTime={isOutOfTime}
        onSuccess={(nombre, tipo) => {
          onSuccess(nombre, tipo);
          resetState();
        }}
        onNewUser={onNewUser}
        onCancel={() => setShowQuickRegister(false)}
      />
    );
  }

  // Search mode
  return (
    <div className="space-y-3">
      {/* Out-of-time banner */}
      {isOutOfTime && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Fuera de horario — se guardarán los datos sin marcar asistencia</span>
        </div>
      )}

      {/* Pre-selection chips: users registered in other programs today */}
      {otrosProgramasUsers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 px-1">
            Ya registrados en otro programa
          </p>
          <div className="flex flex-wrap gap-1.5">
            {otrosProgramasUsers.map(({ usuario, programas }) => (
              <button
                key={usuario.id}
                onClick={() => setSelectedUser(usuario)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full text-sm transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-medium text-gray-800">{usuario.nombre.split(' ')[0]}</span>
                <span className="text-xs text-blue-500">
                  {programas.map(shortenProgramTitle).join(', ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="h-14 text-lg pl-12"
          inputMode="search"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {search.length >= 2 && (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No se encontraron resultados
            </p>
          ) : (
            filtered.map((u) => {
              const otrosProgramas = registrosOtrosProgramas.get(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="w-full flex items-center gap-3 px-4 min-h-[56px] py-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-blue-600">
                      {u.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.nombre}</p>
                      {otrosProgramas && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          {otrosProgramas.map(shortenProgramTitle).join(', ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">+{u.codigoPais} {u.telefono}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      <button
        onClick={() => setShowQuickRegister(true)}
        className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium px-1 py-1"
      >
        <UserPlus className="w-4 h-4" />
        No encontrado? Registrar nuevo
      </button>
    </div>
  );
}
