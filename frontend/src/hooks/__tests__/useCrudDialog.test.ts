import { renderHook, act } from '@testing-library/react';
import { useCrudDialog } from '../useCrudDialog';

describe('useCrudDialog', () => {
  const initialFormData = { nombre: '', orden: 0 };

  it('should initialize with closed state', () => {
    const { result } = renderHook(() => useCrudDialog({ initialFormData }));
    expect(result.current.modalOpen).toBe(false);
    expect(result.current.deleteDialogOpen).toBe(false);
    expect(result.current.editingItem).toBeNull();
    expect(result.current.formData).toEqual(initialFormData);
  });

  it('openCreate should open modal and reset form', () => {
    const { result } = renderHook(() => useCrudDialog({ initialFormData }));
    act(() => result.current.openCreate());
    expect(result.current.modalOpen).toBe(true);
    expect(result.current.editingItem).toBeNull();
    expect(result.current.formData).toEqual(initialFormData);
  });

  it('openCreate with overrides should merge with initial data', () => {
    const { result } = renderHook(() => useCrudDialog({ initialFormData }));
    act(() => result.current.openCreate({ orden: 5 }));
    expect(result.current.formData).toEqual({ nombre: '', orden: 5 });
  });

  it('openEdit should open modal and map item to form', () => {
    const mapItemToForm = (item: any) => ({ nombre: item.name, orden: item.order });
    const { result } = renderHook(() => useCrudDialog({ initialFormData, mapItemToForm }));
    const item = { id: 1, name: 'Test', order: 3 };
    act(() => result.current.openEdit(item));
    expect(result.current.modalOpen).toBe(true);
    expect(result.current.editingItem).toBe(item);
    expect(result.current.formData).toEqual({ nombre: 'Test', orden: 3 });
  });

  it('openEdit without mapItemToForm should use item directly', () => {
    const { result } = renderHook(() => useCrudDialog({ initialFormData }));
    const item = { nombre: 'Direct', orden: 7 };
    act(() => result.current.openEdit(item));
    expect(result.current.formData).toEqual(item);
  });

  it('closeModal should close modal and clear editing item', () => {
    const { result } = renderHook(() => useCrudDialog({ initialFormData }));
    act(() => result.current.openCreate());
    act(() => result.current.closeModal());
    expect(result.current.modalOpen).toBe(false);
    expect(result.current.editingItem).toBeNull();
  });

  it('openDelete/closeDelete should manage delete dialog state', () => {
    const { result } = renderHook(() => useCrudDialog({ initialFormData }));
    const item = { id: 1, nombre: 'Test' };
    act(() => result.current.openDelete(item));
    expect(result.current.deleteDialogOpen).toBe(true);
    expect(result.current.itemToDelete).toBe(item);
    act(() => result.current.closeDelete());
    expect(result.current.deleteDialogOpen).toBe(false);
    expect(result.current.itemToDelete).toBeNull();
  });

  it('isEditing should reflect editing state', () => {
    const { result } = renderHook(() => useCrudDialog({ initialFormData }));
    expect(result.current.isEditing).toBe(false);
    act(() => result.current.openEdit({ id: 1 }));
    expect(result.current.isEditing).toBe(true);
  });
});
