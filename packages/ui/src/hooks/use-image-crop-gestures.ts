"use client";

import type { ImageCrop } from "@grabbin/shared/schemas/image-crop";
import { moveCrop, type ImageDimensions } from "@grabbin/shared/lib/image-crop";
import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";

type CropGesture = Readonly<{
  pointerId: number;
  startX: number;
  startY: number;
  startCrop: ImageCrop;
}>;

type CropGestureOptions = Readonly<{
  isOpen: boolean;
  draftCrop: ImageCrop | undefined;
  frameSize: ImageDimensions;
  onDraftCropChange: Dispatch<SetStateAction<ImageCrop | undefined>>;
}>;

type CropState = Readonly<{
  currentCropRef: { current: ImageCrop | undefined };
  onCropChange: (crop: ImageCrop) => void;
}>;

function useCropState({ draftCrop, onDraftCropChange }: CropGestureOptions) {
  const currentCropRef = useRef(draftCrop);
  useEffect(() => {
    currentCropRef.current = draftCrop;
  }, [draftCrop]);
  const onCropChange = useCallback(
    (crop: ImageCrop) => {
      currentCropRef.current = crop;
      onDraftCropChange(crop);
    },
    [onDraftCropChange],
  );
  return { currentCropRef, onCropChange };
}

function startCropGesture(
  event: ReactPointerEvent<HTMLButtonElement>,
  isOpen: boolean,
  crop: ImageCrop | undefined,
  activeGesture: CropGesture | null,
): CropGesture | undefined {
  if (
    !isOpen ||
    crop === undefined ||
    (event.pointerType === "mouse" && event.button !== 0) ||
    activeGesture !== null
  )
    return undefined;

  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  return {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startCrop: crop,
  };
}

function moveCropGesture(
  event: ReactPointerEvent<HTMLButtonElement>,
  gesture: CropGesture | null,
  frameSize: ImageDimensions,
): ImageCrop | undefined {
  if (gesture?.pointerId !== event.pointerId) return undefined;
  event.preventDefault();
  return moveCrop(
    gesture.startCrop,
    event.clientX - gesture.startX,
    event.clientY - gesture.startY,
    frameSize,
  );
}

function endCropGesture(
  event: ReactPointerEvent<HTMLButtonElement>,
  gesture: CropGesture | null,
): CropGesture | null {
  if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId);
  return gesture?.pointerId === event.pointerId ? null : gesture;
}

function useCropPointerGestures(
  isOpen: boolean,
  frameSize: ImageDimensions,
  cropState: CropState,
) {
  const gestureRef = useRef<CropGesture | null>(null);
  const reset = useCallback(() => {
    gestureRef.current = null;
  }, []);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const gesture = startCropGesture(
        event,
        isOpen,
        cropState.currentCropRef.current,
        gestureRef.current,
      );
      if (gesture !== undefined) gestureRef.current = gesture;
    },
    [cropState, isOpen],
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const crop = moveCropGesture(event, gestureRef.current, frameSize);
      if (crop !== undefined) cropState.onCropChange(crop);
    },
    [cropState, frameSize],
  );
  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      gestureRef.current = endCropGesture(event, gestureRef.current);
    },
    [],
  );
  return { onPointerDown, onPointerMove, onPointerEnd, reset };
}

export const useImageCropGestures = (options: CropGestureOptions) => {
  const cropState = useCropState(options);
  const pointer = useCropPointerGestures(
    options.isOpen,
    options.frameSize,
    cropState,
  );
  return pointer;
};
