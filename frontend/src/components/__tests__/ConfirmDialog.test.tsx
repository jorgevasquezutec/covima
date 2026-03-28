import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default texts', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('should render with custom title and description', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        title="¿Eliminar parte?"
        description="Se desactivará"
      />
    );
    expect(screen.getByText('¿Eliminar parte?')).toBeInTheDocument();
    expect(screen.getByText('Se desactivará')).toBeInTheDocument();
  });

  it('should render with custom confirm label', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Eliminar" />);
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Confirmar'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });
});
