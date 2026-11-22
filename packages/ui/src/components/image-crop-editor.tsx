"use client";

import type { ImageCrop } from "@grabbin/shared/schemas/image-crop";
import {
  getCropStyle,
  type ImageDimensions,
} from "@grabbin/shared/lib/image-crop";
import Crop from "lucide-react/icons/crop";
import X from "lucide-react/icons/x";
import { useRef, type PointerEventHandler, type ReactElement } from "react";
import { useImageCropEditor } from "../hooks/use-image-crop-editor";
import { cn } from "../lib/utils";
import { Button } from "./button";

type ImageCropEditorProps = Readonly<{
  src: string | undefined;
  crop: ImageCrop | null;
  sourceSize: ImageDimensions;
  isSaving: boolean;
  onApply: (crop: ImageCrop) => Promise<void>;
  onError: (cause: unknown) => void;
  onOpenChange: (isOpen: boolean) => void;
}>;

type CropSurfaceProps = Readonly<{
  src: string;
  crop: ImageCrop;
  isSaving: boolean;
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
  onPointerMove: PointerEventHandler<HTMLButtonElement>;
  onPointerEnd: PointerEventHandler<HTMLButtonElement>;
}>;

type CropButtonProps = Readonly<{
  isOpen: boolean;
  controlSize: number;
  onClick: () => void;
}>;

type CropCancelButtonProps = Readonly<{
  onClick: () => void;
}>;

type CropEditorState = ReturnType<typeof useImageCropEditor>;

const hasDimensions = ({ width, height }: ImageDimensions) =>
  width > 0 && height > 0;

const getControlSize = ({ width, height }: ImageDimensions) =>
  Math.max(32, Math.min(40, Math.round(Math.min(width, height) * 0.25)));

function CropPreview({
  src,
  crop,
}: Readonly<{ src: string; crop: ImageCrop }>): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="absolute overflow-hidden rounded-full shadow-2xl profile-image-outline"
      style={getCropStyle(crop)}
    >
      <div
        className="size-full bg-cover bg-center"
        style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
      />
      <span
        className="pointer-events-none absolute rounded-full"
        style={{
          left: `${crop.x}%`,
          top: `${crop.y}%`,
          width: `${crop.width}%`,
          height: `${crop.height}%`,
          boxShadow: "0 0 0 9999px rgb(255 255 255 / 0.35)",
        }}
      />
    </div>
  );
}

function CropSurface({
  src,
  crop,
  isSaving,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: CropSurfaceProps): ReactElement {
  return (
    <Button
      type="button"
      static
      variant="ghost"
      size="icon"
      aria-label="Move image crop"
      aria-busy={isSaving}
      className="pointer-events-auto absolute inset-0 z-20 flex size-full cursor-move! touch-none items-center justify-center overflow-visible rounded-full bg-transparent text-sm font-medium text-muted-foreground"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      disabled={isSaving}
    >
      <CropPreview
        src={src}
        crop={crop}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-full border-[3px] border-black"
      />
    </Button>
  );
}

function CropButton({
  isOpen,
  controlSize,
  onClick,
}: CropButtonProps): ReactElement {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label={isOpen ? "Apply image crop" : "Crop image"}
      onClick={onClick}
      className={cn(
        `pointer-events-auto absolute top-0 left-0 z-30 inline-flex size-9 items-center justify-center rounded-full opacity-0 shadow-large! transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-100 group-hover/image:opacity-100 hover:bg-secondary! focus-visible:scale-100 focus-visible:opacity-100 page-wide:top-2 page-wide:left-2 xl:size-10`,
        isOpen
          ? "cursor-pointer! bg-brand-green text-white! opacity-100 hover:bg-brand-green!"
          : "",
      )}
      style={{ width: controlSize, height: controlSize }}
    >
      <Crop
        aria-hidden="true"
        className="size-5"
        style={{ width: controlSize / 2, height: controlSize / 2 }}
      />
    </Button>
  );
}

function CropCancelButton({ onClick }: CropCancelButtonProps): ReactElement {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label="Cancel image crop"
      onClick={onClick}
      className="pointer-events-auto absolute top-0 right-0 z-30 inline-flex size-9 items-center justify-center rounded-full opacity-100 shadow-large! transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-100 hover:bg-secondary! focus-visible:scale-100 page-wide:top-2 page-wide:right-2 xl:size-10"
    >
      <X
        aria-hidden="true"
        className="size-5"
      />
    </Button>
  );
}

function CropEditorContents({
  src,
  sourceSize,
  isSaving,
  editor,
}: Readonly<{
  src: string | undefined;
  sourceSize: ImageDimensions;
  isSaving: boolean;
  editor: CropEditorState;
}>): ReactElement {
  const canCrop =
    src !== undefined &&
    src.length > 0 &&
    hasDimensions(sourceSize) &&
    hasDimensions(editor.frameSize);
  const controlSize = getControlSize(editor.frameSize);
  const handleCropClick = () => {
    if (editor.isOpen) void editor.applyCrop();
    else editor.openCrop();
  };

  return (
    <>
      {canCrop && editor.isOpen && src !== undefined ? (
        <CropSurface
          src={src}
          crop={editor.renderedCrop}
          isSaving={isSaving}
          onPointerDown={editor.handlePointerDown}
          onPointerMove={editor.handlePointerMove}
          onPointerEnd={editor.handlePointerEnd}
        />
      ) : null}
      {canCrop && !isSaving ? (
        <>
          <CropButton
            isOpen={editor.isOpen}
            controlSize={controlSize}
            onClick={handleCropClick}
          />
          {editor.isOpen ? (
            <CropCancelButton onClick={editor.cancelCrop} />
          ) : null}
        </>
      ) : null}
    </>
  );
}

export function ImageCropEditor({
  src,
  crop,
  sourceSize,
  isSaving,
  onApply,
  onError,
  onOpenChange,
}: ImageCropEditorProps): ReactElement {
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useImageCropEditor({
    editorRef,
    src,
    crop,
    sourceSize,
    onApply,
    onError,
    onOpenChange,
  });

  return (
    <div
      ref={editorRef}
      className={cn(
        `pointer-events-none absolute inset-0`,
        editor.isOpen ? "z-10000" : "",
      )}
    >
      <CropEditorContents
        src={src}
        sourceSize={sourceSize}
        isSaving={isSaving}
        editor={editor}
      />
    </div>
  );
}
