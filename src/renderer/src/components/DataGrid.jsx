import React from 'react';
import './DataGrid.css';

export default function DataGrid({ fields, rows, onRowDoubleClick }) {
  if (!fields || fields.length === 0) return null;

  return (
    <div className="datagrid-wrapper">
      <table className="datagrid">
        <thead>
          <tr>
            <th className="datagrid-row-num">#</th>
            {fields.map((f) => (
              <th key={f.name}>{f.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
              style={onRowDoubleClick ? { cursor: 'pointer' } : undefined}
            >
              <td className="datagrid-row-num">{i + 1}</td>
              {fields.map((f) => (
                <td key={f.name} className={row[f.name] === null ? 'cell-null' : ''}>
                  {formatCell(row[f.name])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value) {
  if (value === null) return 'NULL';
  if (value === undefined) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}
