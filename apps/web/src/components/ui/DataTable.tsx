import { Fragment, useState, type ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  keyFor,
  expandable,
}: {
  rows: T[];
  columns: Column<T>[];
  keyFor: (row: T) => string | number;
  expandable?: (row: T) => ReactNode;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);

  function toggle(key: string) {
    setExpanded(list => (list.includes(key) ? list.filter(k => k !== key) : [...list, key]));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-mint/50">
            {expandable ? (
              <th className="w-10 px-2 py-2" aria-hidden="true">
                <span className="sr-only">Expand</span>
              </th>
            ) : null}
            {columns.map(column => (
              <th key={column.header} className="px-4 py-2 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const key = String(keyFor(row));
            const isOpen = expanded.includes(key);
            return (
              <Fragment key={key}>
                <tr className="border-b border-gray-100">
                  {expandable ? (
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Collapse rows for ${key}` : `Expand rows for ${key}`}
                        onClick={() => toggle(key)}
                        className="rounded p-1 text-gray-ink transition-colors hover:bg-gray-100"
                      >
                        {isOpen ? '▾' : '▸'}
                      </button>
                    </td>
                  ) : null}
                  {columns.map(column => (
                    <td key={column.header} className="px-4 py-2">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
                {expandable && isOpen ? (
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td />
                    <td colSpan={columns.length} className="px-4 py-3">
                      {expandable(row)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
