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
      fill
      unoptimized
      className="rounded-full object-cover profile-image-outline"
    />
  );
}
