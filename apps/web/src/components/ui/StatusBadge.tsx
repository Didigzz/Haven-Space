const STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  verified: 'bg-green-100 text-green-800',
  published: 'bg-green-100 text-green-800',
  approved: 'bg-green-100 text-green-800',
  accepted: 'bg-green-100 text-green-800',
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-700',
  banned: 'bg-red-100 text-red-700',
  flagged: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}
