import { cn } from "@/lib/utils";
import { formatComputed } from "@/lib/spreadsheet/engine";

export function SheetGrid({
  cols,
  rows,
  cells,
  selected,
  editing,
  editVal,
  selDeps,
  selRevDeps,
  cellInputRef,
  onCellClick,
  onCellDoubleClick,
  onCellInputChange,
  onCellInputBlur,
  onCellInputKeyDown,
}) {
  return (
    <div className="grid-wrapper flex-1 overflow-auto rounded-lg border border-grid-border bg-card shadow-sm">
      <table className="border-collapse min-w-full text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 h-7 w-10 border border-grid-border bg-grid-corner" />
            {cols.map((c) => (
              <th
                key={c}
                className="sticky top-0 z-20 min-w-[110px] border border-grid-border bg-grid-header px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="sticky left-0 z-10 w-10 border border-grid-border bg-grid-header px-2 py-1 text-center text-[11px] font-semibold text-muted-foreground select-none">
                {row}
              </td>
              {cols.map((col) => {
                const id = col + row;
                const cell = cells[id];
                const isSelected = selected === id;
                const isDep = !isSelected && selDeps.has(id);
                const isRevDep = !isSelected && selRevDeps.has(id);
                const computed = formatComputed(cell.computed);
                const isErr = typeof cell.computed === "string" && cell.computed.startsWith("#");
                const isNum = typeof cell.computed === "number";

                return (
                  <td
                    key={id}
                    onClick={() => onCellClick(id)}
                    onDoubleClick={() => onCellDoubleClick(id)}
                    className={cn(
                      "relative border border-grid-border bg-card p-0 transition-colors",
                      isSelected && "bg-cell-selected ring-1 ring-inset ring-primary/60",
                      isDep && "bg-cell-dep",
                      isRevDep && "bg-cell-rev-dep",
                    )}
                  >
                    {isSelected && editing ? (
                      <input
                        ref={cellInputRef}
                        className={cn(
                          "block h-7 w-full bg-cell-editing px-2 font-mono text-xs leading-none outline-none",
                          cell.bold && "font-bold",
                        )}
                        value={editVal}
                        onChange={onCellInputChange}
                        onBlur={() => onCellInputBlur(id)}
                        onKeyDown={(e) => onCellInputKeyDown(e, id)}
                      />
                    ) : (
                      <span
                        className={cn(
                          "block h-7 cursor-cell overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 font-mono text-xs leading-5",
                          isErr && "text-destructive font-semibold",
                          isNum && !isErr && "text-right text-primary",
                          !isErr && !isNum && "text-foreground",
                          cell.bold && "font-bold",
                        )}
                      >
                        {computed}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
