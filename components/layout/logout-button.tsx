"use client";

import { useTransition } from "react";

import { logoutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

export function LogoutButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => logoutAction())}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100",
        className,
      )}
      disabled={isPending}
    >
      {children}
    </button>
  );
}

