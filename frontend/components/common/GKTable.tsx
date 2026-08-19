"use client";
import { ReactNode, useMemo, useState } from "react";
export interface GKColumn<T> {
  key: keyof T;
  title: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}
interface GKTableProps<T> {
  columns: GKColumn<T>[];
  data: T[];
  searchable?: boolean;
  pageSize?: number;
  emptyMessage?: string;
}
export default function GKTable<T extends object>({
  columns,
  data,
  searchable = true,
  pageSize = 10,
  emptyMessage = "No data available.",
}: GKTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [ascending, setAscending] = useState(true);
  const filtered = useMemo(() => {
    let rows = [...data];
    if (search) {
      rows = rows.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const first = a[sortKey];
        const second = b[sortKey];
        if (first === second) return 0;
        if (ascending) return first > second ? 1 : -1;
        return first < second ? 1 : -1;
      });
    }
    return rows;
  }, [data, search, sortKey, ascending]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900">
      {searchable && (
        <div className="border-b border-slate-800 p-5">
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
          />
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400">{emptyMessage}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      style={{
                        width: column.width,
                      }}
                      className="cursor-pointer px-5 py-4 text-left font-semibold text-slate-300"
                      onClick={() => {
                        if (!column.sortable) return;
                        if (sortKey === column.key) {
                          setAscending(!ascending);
                        } else {
                          setSortKey(column.key);
                          setAscending(true);
                        }
                      }}
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-800 hover:bg-slate-800/40"
                  >
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-5 py-4">
                        {column.render
                          ? column.render(row[column.key], row)
                          : String(row[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-800 p-5">
            <span className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-slate-700 px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-slate-700 px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
