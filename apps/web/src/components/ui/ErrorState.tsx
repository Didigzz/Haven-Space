export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-error-border bg-error-tint p-4 text-error-ink">
      {message}
    </div>
  );
}
