import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('should render default title', () => {
    render(<EmptyState />);
    expect(screen.getByText('No hay datos')).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(<EmptyState title="No hay partes configuradas" />);
    expect(screen.getByText('No hay partes configuradas')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<EmptyState title="Vacio" description="Crea uno nuevo" />);
    expect(screen.getByText('Crea uno nuevo')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    render(<EmptyState title="Solo titulo" />);
    expect(screen.getByText('Solo titulo')).toBeInTheDocument();
    expect(screen.queryByText('Crea uno nuevo')).not.toBeInTheDocument();
  });

  it('should render inside table when colSpan is provided', () => {
    const { container } = render(
      <table><tbody><EmptyState colSpan={5} title="Sin datos" /></tbody></table>
    );
    const td = container.querySelector('td');
    expect(td).toHaveAttribute('colSpan', '5');
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });
});
