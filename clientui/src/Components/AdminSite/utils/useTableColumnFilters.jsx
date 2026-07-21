import { useMemo, useState } from "react";

const isBlank = (value) => value === "" || value === null || value === undefined;

const normalize = (value) => String(value ?? "").trim().toLowerCase();

export const useTableColumnFilters = (rows, columns) => {
  const [columnFilters, setColumnFilters] = useState({});

  const getColumnValue = (row, column) => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    return row?.[column.accessor];
  };

  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(([, value]) => !isBlank(value));
    if (!activeFilters.length) {
      return rows;
    }

    return rows.filter((row) =>
      activeFilters.every(([columnKey, filterValue]) => {
        const column = columns.find((item) => item.key === columnKey);
        if (!column) {
          return true;
        }

        const rowValue = getColumnValue(row, column);
        if (column.match === "exact" || column.type === "select") {
          return normalize(rowValue) === normalize(filterValue);
        }

        return normalize(rowValue).includes(normalize(filterValue));
      })
    );
  }, [rows, columns, columnFilters]);

  const renderColumnFilter = (column) => {
    const value = columnFilters[column.key] ?? "";
    const className =
      "mt-2 block w-full rounded border border-blueGray-100 bg-white px-2 py-1 text-[11px] font-normal normal-case text-blueGray-600 shadow-sm focus:outline-none focus:ring";

    if (column.type === "select") {
      return (
        <select
          value={value}
          onChange={(event) =>
            setColumnFilters((prev) => ({ ...prev, [column.key]: event.target.value }))
          }
          className={className}
          aria-label={`Filter ${column.label}`}
        >
          <option value="">All</option>
          {(column.options || []).map((option) => (
            <option key={`${column.key}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={column.type === "number" ? "number" : "text"}
        value={value}
        onChange={(event) =>
          setColumnFilters((prev) => ({ ...prev, [column.key]: event.target.value }))
        }
        className={className}
        placeholder="Filter"
        aria-label={`Filter ${column.label}`}
      />
    );
  };

  return { filteredRows, renderColumnFilter, columnFilters, setColumnFilters };
};
