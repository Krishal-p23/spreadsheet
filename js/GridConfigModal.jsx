import React from 'react';

export function GridConfigModal({ isOpen, onClose, onSubmit, defaultRows, defaultCols }) {
  const [rows, setRows] = React.useState(defaultRows);
  const [cols, setCols] = React.useState(defaultCols);

  const handleSubmit = () => {
    const numRows = Math.max(1, Math.min(100, parseInt(rows) || 10));
    const numCols = Math.max(1, Math.min(26, parseInt(cols) || 10));
    onSubmit(numRows, numCols);
    onClose();
  };

  if (!isOpen) return null;

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal-content' },
      React.createElement('h2', null, 'Configure Grid Size'),
      React.createElement('div', { className: 'modal-form' },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Rows (1-100):'),
          React.createElement('input', {
            type: 'number',
            value: rows,
            onChange: e => setRows(e.target.value),
            min: 1,
            max: 100
          })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Columns (1-26):'),
          React.createElement('input', {
            type: 'number',
            value: cols,
            onChange: e => setCols(e.target.value),
            min: 1,
            max: 26
          })
        )
      ),
      React.createElement('div', { className: 'modal-buttons' },
        React.createElement('button', {
          className: 'btn btn-primary',
          onClick: handleSubmit
        }, 'Apply'),
        React.createElement('button', {
          className: 'btn btn-secondary',
          onClick: onClose
        }, 'Cancel')
      )
    )
  );
}
