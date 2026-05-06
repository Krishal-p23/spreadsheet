import React from 'react';

export function Header({ selected, formulaValue, onChange, onFocus, onBlur, onKeyDown, historyLength, futureLength, onUndo, onRedo }) {
  return React.createElement('div', { className: 'toolbar' },
    React.createElement('span', { className: 'cell-ref' }, selected || '—'),
    React.createElement('input', {
      className: 'formula-bar',
      value: formulaValue,
      placeholder: 'Select a cell to edit…',
      onChange: onChange,
      onFocus: onFocus,
      onBlur: onBlur,
      onKeyDown: onKeyDown
    }),
    React.createElement('div', { className: 'btn-group' },
      React.createElement('button', {
        className: 'btn',
        onClick: onUndo,
        disabled: !historyLength,
        title: 'Undo (Ctrl+Z)'
      }, '↩ Undo'),
      React.createElement('button', {
        className: 'btn',
        onClick: onRedo,
        disabled: !futureLength,
        title: 'Redo (Ctrl+Y)'
      }, '↪ Redo'),
    ),
    React.createElement('span', { className: 'status-txt' },
      historyLength ? `${historyLength} step${historyLength > 1 ? 's' : ''} in history` : 'no history'
    )
  );
}
