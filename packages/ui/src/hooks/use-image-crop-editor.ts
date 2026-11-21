"use client";

import type { ImageCrop } from "@grabbin/shared/schemas/image-crop";
import {
  getCenteredCrop,
  isCropCompatible,
  moveCrop,
  type ImageDimensions,
} from "@grabbin/shared/lib/image-crop";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";

type CropDrag = Readonly<{
  pointerId: number;
  startX: number;
  startY: number;
  startCrop: ImageCrop;
}>;

type CropDraftOptions = Readonly<{
  crop: ImageCrop | null;
  sourceSize: ImageDimensions;
  frameSize: ImageDimensions;
  onOpenChange: (isOpen: boolean) => void;
}>;

type CropDragOptions = Readonly<{
  isOpen: boolean;
  draftCrop: ImageCrop | undefined;
  frameSize: ImageDimensions;
  onDraftCropChange: Dispatch<SetStateAction<ImageCrop | undefined>>;
}>;

type ImageCropEditorOptions = Readonly<{
  editorRef: RefObject<HTMLDivElement | null>;
  src: string | undefined;
  crop: ImageCrop | null;
  sourceSize: ImageDimensions;
  onApply: (crop: ImageCrop) => Promise<void>;
  onError: (cause: unknown) => void;
  onOpenChange: (isOpen: boolean) => void;
}>;

const startCropApply = (
  crop: ImageCrop,
  onApply: ImageCropEditorOptions["onApply"],
  onError: ImageCropEditorOptions["onError"],
): Promise<void> => {
  try {
    return onApply(crop).catch(onError);
  } catch (cause: unknown) {
    onError(cause);
    return Promise.resolve();
  }
};

function useFrameSize(editorRef: RefObject<HTMLDivElement | null>) {
  const [frameSize, setFrameSize] = useState<ImageDimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const editor = editorRef.current;
    let observer: ResizeObserver | undefined;
    if (editor !== null) {
      const updateFrameSize = () => {
        const { width, height } = editor.getBoundingClientRect();
        setFrameSize({ width, height });
      };
      observer = new ResizeObserver(updateFrameSize);
      updateFrameSize();
      observer.observe(editor);
    }
    return () => {
      observer?.disconnect();
    };
  }, [editorRef]);

  return frameSize;
}

function useCropDraft({
  crop,
  sourceSize,
  frameSize,
  onOpenChange,
}: CropDraftOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftCrop, setDraftCrop] = useState<ImageCrop>();
  const centeredCrop = getCenteredCrop(sourceSize, frameSize);
  const renderedCrop = isOpen
    ? (draftCrop ?? centeredCrop)
    : crop !== null && isCropCompatible(crop, sourceSize, frameSize)
      ? crop
      : centeredCrop;

  const cancelCrop = useCallback(() => {
    setDraftCrop(undefined);
    setIsOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);
  const openCrop = () => {
    setDraftCrop(renderedCrop);
    setIsOpen(true);
    onOpenChange(true);
  };

  return {
    isOpen,
    draftCrop,
    renderedCrop,
    cancelCrop,
    openCrop,
    setDraftCrop,
  };
}

function useCancelOnSourceChange(
  src: string | undefined,
  onCancel: () => void,
): void {
  const previousSrc = useRef(src);
  useEffect(() => {
    if (previousSrc.current === src) return;
    previousSrc.current = src;
    onCancel();
  }, [onCancel, src]);
}

function useCancelOnOutsidePointerDown(
  editorRef: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  onCancel: () => void,
): void {
  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        editorRef.current?.contains(event.target) === true
      )
        return;
      onCancel();
    };
    if (isOpen)
      document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => {
      if (isOpen)
        document.removeEventListener(
          "pointerdown",
          handleOutsidePointerDown,
          true,
        );
    };
  }, [editorRef, isOpen, onCancel]);
}

function beginCropDrag(
  event: ReactPointerEvent<HTMLButtonElement>,
  crop: ImageCrop,
): CropDrag {
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  return {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startCrop: crop,
  };
}

function moveCropDrag(
  event: ReactPointerEvent<HTMLButtonElement>,
  drag: CropDrag,
  frameSize: ImageDimensions,
  onDraftCropChange: Dispatch<SetStateAction<ImageCrop | undefined>>,
): void {
  event.preventDefault();
  onDraftCropChange(
    moveCrop(
      drag.startCrop,
      event.clientX - drag.startX,
      event.clientY - drag.startY,
      frameSize,
    ),
  );
}

function endCropDrag(
  event: ReactPointerEvent<HTMLButtonElement>,
  dragRef: { current: CropDrag | null },
): void {
  if (dragRef.current?.pointerId !== event.pointerId) return;
  dragRef.current = null;
  if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId);
}

function useCropDrag({
  isOpen,
  draftCrop,
  frameSize,
  onDraftCropChange,
}: CropDragOptions) {
  const dragRef = useRef<CropDrag | null>(null);
  const resetDrag = useCallback(() => {
    dragRef.current = null;
  }, []);
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        !isOpen ||
        draftCrop === undefined ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      dragRef.current = beginCropDrag(event, draftCrop);
    },
    [draftCrop, isOpen],
  );
  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (
        drag === null ||
        draftCrop === undefined ||
        drag.pointerId !== event.pointerId
      )
        return;
      moveCropDrag(event, drag, frameSize, onDraftCropChange);
    },
    [draftCrop, frameSize, onDraftCropChange],
  );
  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      endCropDrag(event, dragRef);
    },
    [],
  );

  return { handlePointerDown, handlePointerMove, handlePointerEnd, resetDrag };
}

export const useImageCropEditor = ({
  editorRef,
  src,
  crop,
  sourceSize,
  onApply,
  onError,
  onOpenChange,
}: ImageCropEditorOptions) => {
  const frameSize = useFrameSize(editorRef);
  const draft = useCropDraft({ crop, sourceSize, frameSize, onOpenChange });
  const drag = useCropDrag({
    isOpen: draft.isOpen,
    draftCrop: draft.draftCrop,
    frameSize,
    onDraftCropChange: draft.setDraftCrop,
  });
  const resetDrag = drag.resetDrag;
  const cancelDraftCrop = draft.cancelCrop;
  const cancelCrop = useCallback(() => {
    resetDrag();
    cancelDraftCrop();
  }, [cancelDraftCrop, resetDrag]);
  useCancelOnSourceChange(src, cancelCrop);
  useCancelOnOutsidePointerDown(editorRef, draft.isOpen, cancelCrop);

  const applyCrop = async () => {
    if (draft.draftCrop === undefined) return;
    const apply = startCropApply(draft.draftCrop, onApply, onError);
    cancelCrop();
    await apply;
  };

  return {
    frameSize,
    isOpen: draft.isOpen,
    renderedCrop: draft.renderedCrop,
    cancelCrop,
    openCrop: draft.openCrop,
    applyCrop,
    handlePointerDown: drag.handlePointerDown,
    handlePointerMove: drag.handlePointerMove,
    handlePointerEnd: drag.handlePointerEnd,
  };
};
