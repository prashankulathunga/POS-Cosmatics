"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createStockAdjustmentAction } from "@/lib/actions/inventory-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InventoryAdjustProduct } from "@/lib/types";

export function StockAdjustmentDialog({ product, trigger }: { product: InventoryAdjustProduct; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    defaultValues: {
      quantityChange: 0,
      note: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createStockAdjustmentAction({
        productId: product.id,
        quantityChange: Number(values.quantityChange),
        note: values.note,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      form.reset();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            Update <span className="font-medium text-slate-900">{product.name}</span> and store the movement reason.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="quantityChange">Quantity change</Label>
            <Input id="quantityChange" type="number" {...form.register("quantityChange")} />
            <p className="text-sm text-slate-500">Use a positive number to add stock, negative to reduce stock.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Reason</Label>
            <Input id="note" placeholder="Damaged items, count correction, restock..." {...form.register("note")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save adjustment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
