"use client";

import type { ImageCrop } from "@grabbin/shared/schemas/image-crop";
import {
  getCenteredCrop,
  moveCrop,
  zoomCrop,
  type ImageDimensions,
} from "@grabbin/shared/lib/image-crop";
import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  type WheelEvent as ReactWheelEvent,
} from "react";

type CropPointer = Readonly<{ x: number; y: number }>;

type CropGesture =
  | Readonly<{
      type: "drag";
      pointerId: number;
      startX: number;
      startY: number;
      startCrop: ImageCrop;
    }>
  | Readonly<{
      type: "pinch";
      pointerIds: readonly [number, number];
      startDistance: number;
      anchor: Readonly<{ x: number; y: number }>;
      startCrop: ImageCrop;
    }>;

type CropGestureOptions = Readonly<{
  isOpen: boolean;
  draftCrop: ImageCrop | undefined;
  frameSize: ImageDimensions;
  sourceSize: ImageDimensions;
  onDraftCropChange: Dispatch<SetStateAction<ImageCrop | undefined>>;
}>;

type CropState = Readonly<{
  currentCropRef: { current: ImageCrop | undefined };
  onCropChange: (crop: ImageCrop) => void;
}>;

const getDistance = (first: CropPointer, second: CropPointer) =>
  Math.hypot(second.x - first.x, second.y - first.y);

const getAnchor = (
  element: HTMLButtonElement,
  point: CropPointer,
): Readonly<{ x: number; y: number }> => {
  const bounds = element.getBoundingClientRect();
  return {
    x: (point.x - bounds.left) / bounds.width,
    y: (point.y - bounds.top) / bounds.height,
  };
};

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
  pointers: Map<number, CropPointer>,
): CropGesture | undefined {
  if (
    !isOpen ||
    crop === undefined ||
    (event.pointerType === "mouse" && event.button !== 0) ||
    pointers.size >= 2
  )
    return undefined;

  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1)
    return {
      type: "drag",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: crop,
    };

  const [firstId, secondId] = [...pointers.keys()];
  if (firstId === undefined || secondId === undefined) return undefined;
  const first = pointers.get(firstId);
  const second = pointers.get(secondId);
  if (first === undefined || second === undefined) return undefined;

  const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  return {
    type: "pinch",
    pointerIds: [firstId, secondId],
    startDistance: Math.max(1, getDistance(first, second)),
    anchor: getAnchor(event.currentTarget, center),
    startCrop: crop,
  };
}

function moveCropGesture(
  event: ReactPointerEvent<HTMLButtonElement>,
  gesture: CropGesture | null,
  pointers: Map<number, CropPointer>,
  frameSize: ImageDimensions,
  maximumCrop: ImageCrop,
): ImageCrop | undefined {
  if (!pointers.has(event.pointerId)) return undefined;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (gesture?.type === "drag" && gesture.pointerId === event.pointerId) {
    event.preventDefault();
    return moveCrop(
      gesture.startCrop,
      event.clientX - gesture.startX,
      event.clientY - gesture.startY,
      frameSize,
    );
  }

  if (
    gesture?.type !== "pinch" ||
    !gesture.pointerIds.includes(event.pointerId)
  )
    return undefined;
  const first = pointers.get(gesture.pointerIds[0]);
  const second = pointers.get(gesture.pointerIds[1]);
  if (first === undefined || second === undefined) return undefined;

  event.preventDefault();
  return zoomCrop(
    gesture.startCrop,
    getDistance(first, second) / gesture.startDistance,
    gesture.anchor,
    maximumCrop,
  );
}

function endCropGesture(
  event: ReactPointerEvent<HTMLButtonElement>,
  gesture: CropGesture | null,
  pointers: Map<number, CropPointer>,
  crop: ImageCrop | undefined,
): CropGesture | null {
  pointers.delete(event.pointerId);
  if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId);

  const remainingPointer = [...pointers.entries()][0];
  if (remainingPointer === undefined) return null;
  if (
    gesture?.type === "pinch" ||
    (gesture?.type === "drag" && gesture.pointerId === event.pointerId)
  ) {
    const [pointerId, point] = remainingPointer;
    return {
      type: "drag",
      pointerId,
      startX: point.x,
      startY: point.y,
      startCrop: crop ?? gesture.startCrop,
    };
  }
  return gesture;
}

function useCropPointerGestures(
  isOpen: boolean,
  frameSize: ImageDimensions,
  maximumCrop: ImageCrop,
  cropState: CropState,
) {
  const pointersRef = useRef(new Map<number, CropPointer>());
  const gestureRef = useRef<CropGesture | null>(null);
  const reset = useCallback(() => {
    pointersRef.current.clear();
    gestureRef.current = null;
  }, []);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const gesture = startCropGesture(
        event,
        isOpen,
        cropState.currentCropRef.current,
        pointersRef.current,
      );
      if (gesture !== undefined) gestureRef.current = gesture;
    },
    [cropState, isOpen],
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const crop = moveCropGesture(
        event,
        gestureRef.current,
        pointersRef.current,
        frameSize,
        maximumCrop,
      );
      if (crop !== undefined) cropState.onCropChange(crop);
    },
    [cropState, frameSize, maximumCrop],
  );
  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      gestureRef.current = endCropGesture(
        event,
        gestureRef.current,
        pointersRef.current,
        cropState.currentCropRef.current,
      );
    },
    [cropState],
  );
  return { onPointerDown, onPointerMove, onPointerEnd, reset };
}

function useCropWheelZoom(
  isOpen: boolean,
  maximumCrop: ImageCrop,
  cropState: CropState,
) {
  return useCallback(
    (event: ReactWheelEvent<HTMLButtonElement>) => {
      const crop = cropState.currentCropRef.current;
      if (!isOpen || crop === undefined) return;

      event.preventDefault();
      cropState.onCropChange(
        zoomCrop(
          crop,
          Math.exp(-event.deltaY * 0.002),
          getAnchor(event.currentTarget, {
            x: event.clientX,
            y: event.clientY,
          }),
          maximumCrop,
        ),
      );
    },
    [cropState, isOpen, maximumCrop],
  );
}

export const useImageCropGestures = (options: CropGestureOptions) => {
  const cropState = useCropState(options);
  const maximumCrop = getCenteredCrop(options.sourceSize, options.frameSize);
  const pointer = useCropPointerGestures(
    options.isOpen,
    options.frameSize,
    maximumCrop,
    cropState,
  );
  const onWheel = useCropWheelZoom(options.isOpen, maximumCrop, cropState);
  return { ...pointer, onWheel };
};
