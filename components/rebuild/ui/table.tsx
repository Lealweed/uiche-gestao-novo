import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   DataTable — consistent dark-mode table with accessible markup
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

function getDefaultRowKey<T>(row: T, idx: number) {
  if (row && typeof row === "object") {
    const record = row as Record<string, unknown>;
    const preferredKey = record.id ?? record.user_id ?? record.shift_id;
    if (typeof preferredKey === "string" || typeof preferredKey === "number") {
      return String(preferredKey);
    }
  }

  return String(idx);
}

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
    <div className={cn("rb-dashboard-table-wrap", className)}>
      <table className="rb-dashboard-table" role="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr role="row">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`skeleton-${i}`} role="row">
                {columns.map((col) => (
                  <td key={col.key}>
                    <div
                      className="h-4 rounded animate-pulse"
                      style={{ background: "var(--ds-surface-2)", width: "70%" }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr role="row">
              <td colSpan={columns.length} className="rb-table-empty" role="cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={keyExtractor ? keyExtractor(row, idx) : getDefaultRowKey(row, idx)} role="row">
                {columns.map((col) => (
                  <td key={col.key} className={col.className} role="cell">
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
