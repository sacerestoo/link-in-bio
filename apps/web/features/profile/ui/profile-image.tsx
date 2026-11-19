import type { ReactElement } from "react";
import Image from "next/image";

export function ProfileImage({
  imageUrl,
}: Readonly<{ imageUrl?: string }>): ReactElement | null {
  if (imageUrl === undefined || imageUrl.length === 0) return null;

  return (
    <Image
      src={imageUrl}
      alt=""
      fill
      unoptimized
      className="rounded-full object-cover profile-image-outline"
    />
  );
}
