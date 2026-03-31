import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   DataTable - Clean light-mode table with accessible markup
------------------------------------------------------------------ */
type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  keyExtractor?: (row: T, idx: number) => string;
  emptyMessage?: string;
  loading?: boolean;
  caption?: string;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  emptyMessage = "Nenhum registro encontrado.",
  loading = false,
  caption,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full text-sm" role="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr role="row" className="bg-slate-50 border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`skeleton-${i}`} role="row">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr role="row">
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-muted"
                role="cell"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={keyExtractor ? keyExtractor(row, idx) : String(idx)}
                role="row"
                className="hover:bg-slate-50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-foreground", col.className)}
                    role="cell"
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
