import { useState, useEffect } from 'react';
import { usuariosApi } from '@/services/api';
import type { Usuario, Rol } from '@/types';
import PhoneInput, { parsePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Search,
  Pencil,
  Key,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
} from 'lucide-react';
import UsuarioForm from './UsuarioForm';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState<string>('all');
  const [activoFilter, setActivoFilter] = useState<string>('all');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Phone edit dialog
  const [phoneEditOpen, setPhoneEditOpen] = useState(false);
  const [phoneEditUser, setPhoneEditUser] = useState<Usuario | null>(null);
  const [phoneValue, setPhoneValue] = useState<string | undefined>('');

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadUsuarios();
  }, [meta.page, search, rolFilter, activoFilter]);

  const loadRoles = async () => {
    try {
      const data = await usuariosApi.getRoles();
      setRoles(data);
    } catch {
      toast.error('Error al cargar roles');
    }
  };

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: meta.page,
        limit: meta.limit,
      };
      if (search) params.search = search;
      if (rolFilter !== 'all') params.rol = rolFilter;
      if (activoFilter !== 'all') params.activo = activoFilter === 'true';

      const response = await usuariosApi.getAll(params);
      setUsuarios(response.data);
      setMeta(response.meta);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (usuario: Usuario) => {
    try {
      await usuariosApi.toggleActive(usuario.id);
      toast.success(
        usuario.activo ? 'Usuario desactivado' : 'Usuario activado'
      );
      loadUsuarios();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;

    try {
      await usuariosApi.resetPassword(resetPasswordUser.id, newPassword);
      toast.success('Contraseña actualizada');
      setResetPasswordOpen(false);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch {
      toast.error('Error al resetear contraseña');
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingUser(null);
    loadUsuarios();
  };

  const handleEditPhone = async () => {
    if (!phoneEditUser || !phoneValue) return;

    try {
      const parsed = parsePhoneNumber(phoneValue);
      if (!parsed) {
        toast.error('Número de teléfono inválido');
        return;
      }

      const codigoPais = parsed.countryCallingCode;
      const telefono = parsed.nationalNumber;

      await usuariosApi.updateTelefono(phoneEditUser.id, codigoPais, telefono);
      toast.success('Teléfono actualizado correctamente');
      setPhoneEditOpen(false);
      setPhoneEditUser(null);
      setPhoneValue('');
      loadUsuarios();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al actualizar teléfono');
    }
  };

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'lider':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Usuarios
          </h1>
          <p className="text-gray-500">Gestiona los usuarios del sistema</p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setFormOpen(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setMeta((m) => ({ ...m, page: 1 }));
                }}
                className="pl-10 bg-white border-gray-300 text-gray-900"
              />
            </div>
            <Select
              value={rolFilter}
              onValueChange={(v) => {
                setRolFilter(v);
                setMeta((m) => ({ ...m, page: 1 }));
              }}
            >
              <SelectTrigger className="w-full sm:w-40 bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all">Todos los roles</SelectItem>
                {roles.map((rol) => (
                  <SelectItem key={rol.id} value={rol.nombre}>
                    {rol.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activoFilter}
              onValueChange={(v) => {
                setActivoFilter(v);
                setMeta((m) => ({ ...m, page: 1 }));
              }}
            >
              <SelectTrigger className="w-full sm:w-40 bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-gray-600">Nombre</TableHead>
                  <TableHead className="text-gray-600">Teléfono</TableHead>
                  <TableHead className="text-gray-600">Roles</TableHead>
                  <TableHead className="text-gray-600">Estado</TableHead>
                  <TableHead className="text-gray-600 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((usuario) => (
                    <TableRow key={usuario.id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{usuario.nombre}</p>
                          {usuario.email && (
                            <p className="text-sm text-gray-500">{usuario.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        +{usuario.codigoPais} {usuario.telefono}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {usuario.roles.map((rol) => (
                            <Badge
                              key={rol}
                              variant="outline"
                              className={getRoleBadgeColor(rol)}
                            >
                              {rol}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={usuario.activo}
                          onCheckedChange={() => handleToggleActive(usuario)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser(usuario);
                              setFormOpen(true);
                            }}
                            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setResetPasswordUser(usuario);
                              setResetPasswordOpen(true);
                            }}
                            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPhoneEditUser(usuario);
                              setPhoneValue(`+${usuario.codigoPais}${usuario.telefono}`);
                              setPhoneEditOpen(true);
                            }}
                            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            title="Editar teléfono"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Mostrando {(meta.page - 1) * meta.limit + 1} a{' '}
                {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page === 1}
                  onClick={() => setMeta((m) => ({ ...m, page: m.page - 1 }))}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page === meta.totalPages}
                  onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingUser
                ? 'Modifica los datos del usuario (incluye información del perfil)'
                : 'Completa los datos para crear un nuevo usuario'}
            </DialogDescription>
          </DialogHeader>
          <UsuarioForm
            usuario={editingUser}
            roles={roles}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Resetear Contraseña</DialogTitle>
            <DialogDescription className="text-gray-500">
              Nueva contraseña para {resetPasswordUser?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordOpen(false);
                setNewPassword('');
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 6}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Edit Dialog */}
      <Dialog open={phoneEditOpen} onOpenChange={setPhoneEditOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Editar Teléfono</DialogTitle>
            <DialogDescription className="text-gray-500">
              Actualizar teléfono de {phoneEditUser?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <PhoneInput
              international
              countryCallingCodeEditable={false}
              defaultCountry="PE"
              value={phoneValue}
              onChange={(value) => setPhoneValue(value)}
              className="phone-input-light"
              numberInputProps={{
                className:
                  'flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 rounded-r-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border',
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPhoneEditOpen(false);
                setPhoneEditUser(null);
                setPhoneValue('');
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditPhone}
              disabled={!phoneValue || phoneValue.length < 8}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
