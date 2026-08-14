import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  keyFor,
}: {
  rows: T[];
  columns: Column<T>[];
  keyFor: (row: T) => string | number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-mint/50">
            {columns.map((column) => (
              <th key={column.header} className="px-4 py-2 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFor(row)} className="border-b border-gray-100 last:border-0">
              {columns.map((column) => (
                <td key={column.header} className="px-4 py-2">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
