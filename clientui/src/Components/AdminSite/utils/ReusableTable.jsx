// import React from 'react';

// const ReusableTable = ({ columns, data }) => {
//   return (
//     <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
//       <thead>
//         <tr>
//           {columns.map((col, index) => (
//             <th key={index}>{col.header}</th>
//           ))}
//         </tr>
//       </thead>
//       <tbody>
//         {data.length === 0 ? (
//           <tr>
//             <td colSpan={columns.length} style={{ textAlign: 'center' }}>No data available</td>
//           </tr>
//         ) : (
//           data.map((row, rowIndex) => (
//             <tr key={rowIndex}>
//               {columns.map((col, colIndex) => (
//                 <td key={colIndex}>{row[col.accessor]}</td>
//               ))}
//             </tr>
//           ))
//         )}
//       </tbody>
//     </table>
//   );
// };

// export default ReusableTable;


import React, { useMemo, useState } from 'react';

const ReusableTable = ({ columns, data }) => {
  const [filters, setFilters] = useState({});

  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, value]) => String(value || '').trim());
    if (!activeFilters.length) {
      return data;
    }

    return data.filter((row) =>
      activeFilters.every(([accessor, value]) =>
        String(row[accessor] ?? '').toLowerCase().includes(String(value).trim().toLowerCase())
      )
    );
  }, [data, filters]);

  return (
    <div className="overflow-x-auto mt-6">
      <table className="min-w-full bg-white border border-gray-200 shadow rounded-lg text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-700 font-medium">
            {columns.map((col, index) => (
              <th key={index} className="px-4 py-3 border-b border-gray-300 whitespace-nowrap">
                <div>{col.header}</div>
                <input
                  type="text"
                  value={filters[col.accessor] || ''}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      [col.accessor]: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-xs font-normal text-gray-600 focus:outline-none focus:ring"
                  placeholder="Filter"
                  aria-label={`Filter ${col.header}`}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-4 text-gray-500">
                No data available
              </td>
            </tr>
          ) : (
            filteredData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 even:bg-gray-50">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 border-b border-gray-200 text-gray-600 whitespace-nowrap">
                    {row[col.accessor] !== null ? row[col.accessor].toString() : ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReusableTable;
