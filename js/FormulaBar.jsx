import React from 'react';

export function FormulaBar({ selected, formulaValue, isEditing, editValue, onChange, onFocus, onBlur, onKeyDown }) {
  return React.createElement('input', {
    className: 'formula-bar',
    value: isEditing ? editValue : formulaValue,
    placeholder: 'Select a cell to edit…',
    onChange: onChange,
    onFocus: onFocus,
    onBlur: onBlur,
    onKeyDown: onKeyDown
  });
}
