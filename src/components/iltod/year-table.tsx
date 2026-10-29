/** Years as columns, one hairline row per series, folded into a `<details>` (/budget, /prices). */
export function YearTable({
  caption,
  years,
  rows,
  format,
  summary = "Он оноор хүснэгтээр харах",
  rowHeader = "Ангилал",
}: {
  caption: string;
  years: string[];
  rows: { name: string; values: Record<string, number | null> }[];
  format: (v: number | null) => string;
  summary?: string;
  rowHeader?: string;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-tertiary">{summary}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line text-xs text-tertiary">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                {rowHeader}
              </th>
              {years.map((y) => (
                <th key={y} scope="col" className="py-2 pr-4 text-right font-medium">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((r) => (
              <tr key={r.name}>
                <th scope="row" className="py-2 pr-4 font-medium text-primary">
                  {r.name}
                </th>
                {years.map((y) => (
                  <td key={y} className="py-2 pr-4 text-right whitespace-nowrap text-secondary tabular-nums">
                    {format(r.values[y] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
