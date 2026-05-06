# Spreadsheet Engine - Refactored Architecture

## Overview
This is a fully refactored React-based spreadsheet application with a clean, modular component structure and support for expandable m×n grids.

## Directory Structure

```
spreadsheet/
├── index.html                 # Main HTML entry point
├── styles/
│   └── style.css             # All application styles
├── js/
│   ├── spreadsheet-app.js    # Main consolidated application (all components + utilities)
│   ├── app.jsx               # Original refactored app (modular components)
│   ├── Header.jsx            # Toolbar component
│   ├── Footer.jsx            # Info bar component
│   ├── Sheet.jsx             # Grid component
│   ├── GridConfigModal.jsx   # Grid configuration modal
│   ├── cellModel.js          # Cell computation and state management
│   ├── graphUtils.js         # Dependency graph utilities
│   └── formulaEngine.js      # Formula parsing and evaluation
```

## Key Features

### 1. **Dynamic Grid Sizing**
- Click the **⚙ M×N** button in the toolbar to resize the grid
- Supports up to 26 columns (A-Z) and 100 rows
- Configuration modal with input validation
- Grid clears when resizing (can be modified to preserve data)

### 2. **Component Architecture**
The application is organized into reusable components:

- **Header.jsx** - Toolbar with formula bar, undo/redo buttons, and cell reference display
- **Sheet.jsx** - Interactive spreadsheet grid with cell selection and editing
- **Footer.jsx** - Info bar with dependency highlighting legend and shortcuts
- **GridConfigModal.jsx** - Modal dialog for configuring grid dimensions

### 3. **Formula Engine**
- Recursive descent parser for arithmetic expressions
- Supports cell references (A1, B5, etc.)
- Operations: `+`, `-`, `*`, `/`, parentheses
- Error handling: `#ERROR`, `#REF`, `#DIV/0`, `#CIRCULAR`

### 4. **Dependency Tracking**
- Automatic dependency graph management
- Cycle detection with `#CIRCULAR` error
- Dependency highlighting (blue = dependencies, green = dependents)
- BFS-based cascading recalculation

### 5. **Undo/Redo System**
- Full state snapshots (limited to 50 steps)
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)

## Usage

### Starting the App
1. Open `index.html` in a modern browser
2. The spreadsheet loads with a 10×10 grid by default

### Editing Cells
- **Click** to select a cell
- **Double-click** or press **Enter** to edit
- Type formulas starting with `=` (e.g., `=A1+B2`)
- Press **Enter** to confirm, **Escape** to cancel

### Navigation
- **Arrow keys** to move between cells
- **Tab** to move right, **Shift+Tab** to move left
- **Ctrl+Z / Ctrl+Y** for undo/redo

### Resizing the Grid
- Click the **⚙ M×N** button
- Enter desired rows (1-100) and columns (1-26)
- Click **Apply**

## File Descriptions

### spreadsheet-app.js (Main Application)
This consolidated file contains:
- All utility functions (column/row generation, ID creation)
- Formula engine (tokenization, expression evaluation)
- Graph utilities (cycle detection, topological sorting)
- Cell model (computation, propagation, snapshots)
- All React components (Header, Footer, Sheet, Modal)
- Main App component with state management

**Why consolidated?** Provides browser compatibility without requiring a build tool or bundler. Plain script tag loading with React CDN.

### Modular Component Files (Optional)
For development with a bundler (Webpack, Vite, etc.):
- `Header.jsx` - Export-ready component
- `Footer.jsx` - Export-ready component
- `Sheet.jsx` - Export-ready component
- `GridConfigModal.jsx` - Export-ready component
- `cellModel.js` - Cell utilities with exports
- `graphUtils.js` - Graph utilities with exports
- `formulaEngine.js` - Formula engine with exports

## Technical Details

### State Management
```javascript
- cells: { id: { raw, computed, formula } }
- deps: { id: Set<dependencies> }
- revDeps: { id: Set<dependents> }
- selected: current cell ID
- editing: edit mode flag
- editVal: current edit input value
- history / future: undo/redo stacks
```

### Cell Computation
1. User enters value → `commitCell(id, rawVal)`
2. State snapshot taken for undo history
3. Cell marked as formula or plain value
4. `propagate()` recalculates cell and downstream dependents
5. Dependency graph updated, cycles detected
6. UI re-renders with new values

### Grid Resizing
1. User configures new dimensions → `handleGridResize(rows, cols)`
2. Generate new column letters and row numbers
3. Create fresh cell state (data cleared)
4. Reset dependencies and computation state
5. Clear undo/redo history
6. Re-render with new grid dimensions

## Styling

### CSS Organization
- **Global**: Basic resets and body styling
- **Toolbar**: Formula bar, buttons, cell reference display
- **Grid**: Table styling, sticky headers, cell layout
- **Cells**: Display styles (numbers, text, errors), edit mode, highlights
- **Info Bar**: Legend and shortcuts display
- **Modal**: Overlay, form inputs, buttons

### Color Scheme
- **Primary Blue**: `#185FA5`, `#378ADD` - Interactive elements
- **Error Red**: `#E24B4A` - Error cell display
- **Highlight Blue**: `#e6f1fb` - Dependency highlight
- **Highlight Green**: `#eaf3de` - Dependent highlight

## Future Enhancements

- [ ] Multi-sheet support
- [ ] More formula functions (SUM, AVERAGE, IF, etc.)
- [ ] Data persistence (LocalStorage / IndexedDB)
- [ ] Copy/paste support
- [ ] Cell formatting (bold, color, alignment)
- [ ] Data validation rules
- [ ] Chart generation
- [ ] Collaborative editing
- [ ] CSV import/export

## Browser Compatibility
- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Requires ES6 support and React 18

## License
Open source - modify and distribute freely.
