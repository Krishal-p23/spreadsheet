import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GridConfigModal({ open, onOpenChange, onSubmit, defaultRows, defaultCols }) {
  const [rows, setRows] = useState(String(defaultRows));
  const [cols, setCols] = useState(String(defaultCols));

  useEffect(() => {
    if (open) {
      setRows(String(defaultRows));
      setCols(String(defaultCols));
    }
  }, [open, defaultRows, defaultCols]);

  const handleSubmit = () => {
    const r = Math.max(1, Math.min(100, parseInt(rows) || 10));
    const c = Math.max(1, Math.min(26, parseInt(cols) || 10));
    onSubmit(r, c);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure grid size</DialogTitle>
          <DialogDescription>Resetting the grid will clear all cell data.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="rows">Rows (1–100)</Label>
            <Input id="rows" type="number" min={1} max={100} value={rows} onChange={(e) => setRows(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cols">Columns (1–26)</Label>
            <Input id="cols" type="number" min={1} max={26} value={cols} onChange={(e) => setCols(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
