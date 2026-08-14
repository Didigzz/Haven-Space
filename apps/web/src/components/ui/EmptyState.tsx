export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 text-gray-ink">{description}</p> : null}
    </div>
  );
}
