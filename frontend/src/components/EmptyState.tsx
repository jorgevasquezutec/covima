import type { LucideIcon } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  colSpan?: number;
}

export function EmptyState({ icon: Icon, title = 'No hay datos', description, colSpan }: EmptyStateProps) {
  const content = (
    <div className="text-center py-8">
      {Icon && <Icon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />}
      <p className="text-muted-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>}
    </div>
  );

  if (colSpan) {
    return <TableRow><TableCell colSpan={colSpan} className="text-center">{content}</TableCell></TableRow>;
  }
  return content;
}
