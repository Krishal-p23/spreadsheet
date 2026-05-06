import React from 'react';

export function Footer() {
  return React.createElement('div', { className: 'info-bar' },
    React.createElement('span', { className: 'legend' },
      React.createElement('span', { className: 'dot dep' }),
      'depends on'
    ),
    React.createElement('span', { className: 'legend' },
      React.createElement('span', { className: 'dot rev' }),
      'dependents'
    ),
    React.createElement('span', { className: 'shortcuts' },
      'Double-click or Enter to edit · Arrow keys to navigate · Ctrl+Z/Y to undo/redo · Delete to clear'
    )
  );
}
