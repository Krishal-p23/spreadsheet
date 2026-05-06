import { Bold, Redo2, Settings2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Toolbar({
  selected,
  formulaValue,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  historyLength,
  futureLength,
  onUndo,
  onRedo,
  onToggleBold,
  isBold,
  numCols,
  numRows,
  onOpenConfig,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-grid-border bg-card px-3 py-2 shadow-sm">
      <span className="min-w-[44px] font-mono text-sm font-semibold tracking-wider text-primary">
        {selected || "—"}
      </span>
      <Input
        className="h-8 flex-1 min-w-[200px] font-mono text-xs"
        placeholder="Select a cell to edit…"
        value={formulaValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={isBold ? "default" : "outline"}
          className={cn("h-8 w-8 p-0", isBold && "shadow-inner")}
          disabled={!selected}
          onClick={onToggleBold}
          title="Bold (Ctrl+B)"
          aria-pressed={isBold}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2"
          onClick={onUndo}
          disabled={!historyLength}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2"
          onClick={onRedo}
          disabled={!futureLength}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 font-mono text-xs"
          onClick={onOpenConfig}
          title="Configure grid"
        >
          <Settings2 className="mr-1 h-4 w-4" />
          {numCols}×{numRows}
        </Button>
      </div>
    </div>
  );
}
