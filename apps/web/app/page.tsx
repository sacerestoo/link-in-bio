import type { ReactNode } from "react";

export default function HomePage(): ReactNode {
  return (
    <div className="min-h-svh">
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col items-center justify-center px-6 py-20 text-center sm:px-10">
        <p>Link in bio</p>
      </main>
    </div>
  );
}
