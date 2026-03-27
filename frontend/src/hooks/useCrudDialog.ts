import { useState, useCallback } from 'react';

interface UseCrudDialogOptions<TForm> {
  initialFormData: TForm;
  mapItemToForm?: (item: any) => TForm;
}

export function useCrudDialog<TForm>(options: UseCrudDialogOptions<TForm>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [formData, setFormData] = useState<TForm>(options.initialFormData);

  const openCreate = useCallback((overrides?: Partial<TForm>) => {
    setEditingItem(null);
    setFormData({ ...options.initialFormData, ...overrides });
    setModalOpen(true);
  }, [options.initialFormData]);

  const openEdit = useCallback((item: any) => {
    setEditingItem(item);
    setFormData(options.mapItemToForm ? options.mapItemToForm(item) : item);
    setModalOpen(true);
  }, [options.mapItemToForm]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingItem(null);
  }, []);

  const openDelete = useCallback((item: any) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  }, []);

  return {
    modalOpen, setModalOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    editingItem,
    itemToDelete,
    formData, setFormData,
    openCreate, openEdit, closeModal,
    openDelete, closeDelete,
    isEditing: editingItem !== null,
  };
}
