export function CardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-2xl bg-primary p-5 ring-1 ring-line ring-inset">
      <div className="flex gap-2">
        <div className="h-5 w-24 rounded-full bg-tertiary" />
        <div className="h-5 w-16 rounded-full bg-secondary" />
      </div>
      <div className="h-5 w-11/12 rounded bg-tertiary" />
      <div className="h-5 w-2/3 rounded bg-tertiary" />
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full rounded bg-secondary" />
        <div className="h-3 w-5/6 rounded bg-secondary" />
        <div className="h-3 w-4/6 rounded bg-secondary" />
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-secondary" />
    </div>
  );
}

export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
