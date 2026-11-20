import type { ReactElement } from "react";
import Image from "next/image";

export function ProfileImage({
  src,
}: Readonly<{ src?: string | null }>): ReactElement | null {
  if (src === undefined || src === null || src.length === 0) return null;

  return (
    <Image
      src={src}
      alt=""
      width={200}
      height={200}
      loading="eager"
      fetchPriority="high"
      unoptimized
      className="size-full rounded-full object-cover profile-image-outline"
    />
  );
}
