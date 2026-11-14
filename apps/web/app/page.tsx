import type { ReactNode } from "react";
import { Button } from "@grabbin/ui/components/button";
import Link from "next/link";

export default function HomePage(): ReactNode {
  return (
    <div className="min-h-svh">
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col items-center justify-center px-6 py-20 text-center sm:px-10">
        <p>Link in bio</p>
        <Button
          nativeButton={false}
          variant={"outline"}
          className={"px-4"}
          render={<Link href={"/sign-in"} />}
        >
          Sign in
        </Button>
      </main>
    </div>
  );
}
