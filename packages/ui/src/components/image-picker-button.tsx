import type { ReactElement } from "react";
import { Button } from "@grabbin/ui/components/button";
import CircleFadingArrowUp from "lucide-react/icons/circle-fading-arrow-up";
import Image from "next/image";

type ImagePickerButtonProps = Readonly<{
  image: string | undefined;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}>;

export default function ImagePickerButton({
  image,
  label,
  disabled,
  onClick,
}: ImagePickerButtonProps): ReactElement {
  return (
    <Button
      type="button"
      variant="secondary"
      className="size-24 flex-none overflow-hidden rounded-full bg-muted p-0"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {image !== undefined && image !== "" ? (
        <Image
          src={image}
          alt=""
          width={96}
          height={96}
          // Picked images are local object or data URLs.
          unoptimized
          className="size-full rounded-full object-cover profile-image-outline"
        />
      ) : (
        <CircleFadingArrowUp className="size-7 text-muted-foreground" />
      )}
    </Button>
  );
}
