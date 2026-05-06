import React from 'react';

export function Sheet({ COLS, ROWS, cells, selected, editing, editVal, selDepsSet, selRevDepsSet, onCellClick, onCellDoubleClick, onCellInputRef, onCellInputChange, onCellInputBlur, onCellInputKeyDown, cellInputRef }) {
  const { useState, useCallback } = React;

  function fmtComputed(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') {
      return parseFloat(v.toPrecision(10)).toString();
    }
    return String(v);
  }

  return React.createElement('div', { className: 'grid-wrapper' },
    React.createElement('table', { className: 'grid' },
      React.createElement('thead', null,
        React.createElement('tr', null,
          React.createElement('th', { className: 'corner' }),
          ...COLS.map(c => React.createElement('th', { key: c, className: 'col-header' }, c))
        )
      ),
      React.createElement('tbody', null,
        ...ROWS.map(row =>
          React.createElement('tr', { key: row },
            React.createElement('td', { className: 'row-header' }, row),
            ...COLS.map(col => {
              const id = col + row;
              const cell = cells[id];
              const isSelected = selected === id;
              const isDep = !isSelected && selDepsSet && selDepsSet.has(id);
              const isRevDep = !isSelected && selRevDepsSet && selRevDepsSet.has(id);
              const computed = fmtComputed(cell.computed);
              const isErr = typeof cell.computed === 'string' && cell.computed.startsWith('#');
              const isNum = typeof cell.computed === 'number';

              let tdCls = 'cell-td';
              if (isSelected) tdCls += ' selected';
              else if (isDep) tdCls += ' dep-highlight';
              else if (isRevDep) tdCls += ' rev-dep-highlight';

              return React.createElement('td', {
                key: id,
                className: tdCls,
                onClick: () => onCellClick(id),
                onDoubleClick: () => onCellDoubleClick(id)
              },
                (isSelected && editing)
                  ? React.createElement('input', {
                      className: 'cell-input',
                      ref: cellInputRef,
                      value: editVal,
                      onChange: onCellInputChange,
                      onBlur: () => onCellInputBlur(id),
                      onKeyDown: e => onCellInputKeyDown(e, id)
                    })
                  : React.createElement('span', {
                      className: 'cell-display' + (isErr ? ' is-err' : isNum ? ' is-num' : ' is-text')
                    }, computed)
              );
            })
          )
        )
      )
    )
  );
}
