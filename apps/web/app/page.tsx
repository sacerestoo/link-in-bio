import type { ReactNode } from "react";
import { Button } from "@grabbin/ui/components/button";

export default function HomePage(): ReactNode {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">grabbin</h1>
      <Button variant={"outline"}>shadcn Button from @grabbin/ui</Button>
    </main>
  );
}
