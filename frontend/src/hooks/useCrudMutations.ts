import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MutationConfig<TCreate, TUpdate> {
  createFn?: (data: TCreate) => Promise<any>;
  updateFn?: (id: number, data: TUpdate) => Promise<any>;
  deleteFn?: (id: number) => Promise<any>;
  queryKeys: string[];  // Keys to invalidate
  onSuccess?: () => void;  // Called after any successful mutation (e.g., closeModal)
  entityName?: string;  // For toast messages: "Parte", "Nivel", etc.
}

export function useCrudMutations<TCreate = any, TUpdate = any>(config: MutationConfig<TCreate, TUpdate>) {
  const queryClient = useQueryClient();
  const entityName = config.entityName || 'Registro';

  const invalidate = () => {
    config.queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  const createMutation = useMutation({
    mutationFn: config.createFn!,
    onSuccess: () => {
      invalidate();
      toast.success(`${entityName} creado`);
      config.onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Error al crear ${entityName.toLowerCase()}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TUpdate }) =>
      config.updateFn!(id, data),
    onSuccess: () => {
      invalidate();
      toast.success(`${entityName} actualizado`);
      config.onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Error al actualizar ${entityName.toLowerCase()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: config.deleteFn!,
    onSuccess: () => {
      invalidate();
      toast.success(`${entityName} eliminado`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Error al eliminar ${entityName.toLowerCase()}`);
    },
  });

  return {
    createMutation: config.createFn ? createMutation : undefined,
    updateMutation: config.updateFn ? updateMutation : undefined,
    deleteMutation: config.deleteFn ? deleteMutation : undefined,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
