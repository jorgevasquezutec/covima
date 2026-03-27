import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
  type?: 'table' | 'cards' | 'form';
}

export function PageSkeleton({ type = 'table' }: PageSkeletonProps) {
  if (type === 'cards') {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  // Default: table
  return (
    <div className="p-4 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
