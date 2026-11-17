import { Button } from "@grabbin/ui/components/button";
import Link from "next/link";

export default function CreateYoursLink() {
  return (
    <Button
      nativeButton={false}
      variant="outline"
      className="px-4"
      render={
        <Link
          href="/sign-in"
          prefetch={false}
        />
      }
    >
      Create yours
    </Button>
  );
}
