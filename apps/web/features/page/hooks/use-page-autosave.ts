import type { BentoItem } from "@grabbin/shared/schemas/bento-item";
import type { Handle, PageResponse } from "@grabbin/shared/schemas/page";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import isEqual from "es-toolkit/compat/isEqual";
import { debounce, type DebouncedFunction } from "es-toolkit/function";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPageSaveDraft,
  createPageSaveRequest,
  type PageSaveDraft,
} from "../batch";
import {
  pageMutationKeys,
  pageMutations,
  type PageSaveVariables,
} from "../mutations";

const DEBOUNCE_MS = 1500;

type PageAutosaveState = {
  handle: Handle;
  draft: PageSaveDraft;
  saved: PageSaveDraft;
  hasQueuedSave: boolean;
};
const createPageAutosaveState = (
  handle: Handle,
  draft: PageSaveDraft,
): PageAutosaveState => ({
  handle,
  draft,
  saved: draft,
  hasQueuedSave: false,
});
type PageAutosaveStateRef = { current: PageAutosaveState };
type DebouncedSaveRef = {
  current: DebouncedFunction<() => void> | null;
};
type SaveRef = { current: () => Promise<void> };
type SaveLatestDraftContext = Readonly<{
  handle: Handle;
  stateRef: PageAutosaveStateRef;
  debouncedSaveRef: DebouncedSaveRef;
  queryClient: QueryClient;
  saveRef: SaveRef;
  mutateAsync: (variables: PageSaveVariables) => Promise<PageResponse>;
}>;

const saveLatestDraft = async ({
  handle,
  stateRef,
  debouncedSaveRef,
  queryClient,
  saveRef,
  mutateAsync,
}: SaveLatestDraftContext): Promise<void> => {
  const state = stateRef.current;
  if (state.handle !== handle) return;
  if (
    queryClient.isMutating({ mutationKey: pageMutationKeys.savePage(handle) }) >
    0
  ) {
    state.hasQueuedSave = true;
    return;
  }

  const save = createPageSaveRequest(state.saved, state.draft);
  if (save === null) return;

  try {
    const savedPage = await mutateAsync({ handle, save });
    const latestState = stateRef.current;
    if (latestState.handle !== handle) return;

    latestState.saved = createPageSaveDraft(savedPage);
  } catch {
    const latestState = stateRef.current;
    if (latestState.handle !== handle) return;

    debouncedSaveRef.current?.cancel();
    latestState.hasQueuedSave = false;
    return;
  }

  const latestState = stateRef.current;
  if (latestState.handle !== handle) return;

  const shouldSaveQueuedDraft = latestState.hasQueuedSave;
  latestState.hasQueuedSave = false;
  if (shouldSaveQueuedDraft) await saveRef.current();
};

export const usePageAutosave = (handle: Handle, initialPage: PageResponse) => {
  const debouncedSaveRef = useRef<DebouncedSaveRef["current"]>(null);
  const saveRef = useRef<SaveRef["current"]>(async () => {});
  const queryClient = useQueryClient();
  const initialDraft = createPageSaveDraft(initialPage);
  const [draft, setDraft] = useState(initialDraft);
  const stateRef = useRef(createPageAutosaveState(handle, initialDraft));
  const { mutateAsync } = useMutation(pageMutations.savePage(handle));
  const save = useCallback(
    () =>
      saveLatestDraft({
        handle,
        stateRef,
        debouncedSaveRef,
        queryClient,
        saveRef,
        mutateAsync,
      }),
    [handle, mutateAsync, queryClient],
  );

  const updateDraft = useCallback((update: Partial<PageSaveDraft>) => {
    const state = stateRef.current;
    const nextDraft = { ...state.draft, ...update };
    if (isEqual(nextDraft, state.draft)) return;

    state.draft = nextDraft;
    state.hasQueuedSave = false;
    setDraft(nextDraft);
    debouncedSaveRef.current?.();
  }, []);
  const setName = useCallback(
    (name: string) => {
      updateDraft({ name });
    },
    [updateDraft],
  );
  const setBio = useCallback(
    (bio: string) => {
      updateDraft({ bio });
    },
    [updateDraft],
  );
  const setBento = useCallback(
    (bento: readonly BentoItem[]) => {
      updateDraft({ bento });
    },
    [updateDraft],
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    const debouncedSave = debounce(() => {
      void saveRef.current();
    }, DEBOUNCE_MS);
    debouncedSaveRef.current = debouncedSave;

    return () => {
      debouncedSave.cancel();
      debouncedSaveRef.current = null;
    };
  }, []);
  useEffect(() => {
    const state = stateRef.current;
    if (state.handle === handle) return;

    debouncedSaveRef.current?.cancel();
    const nextDraft = createPageSaveDraft(initialPage);
    stateRef.current = createPageAutosaveState(handle, nextDraft);
    setDraft(nextDraft);
  }, [handle, initialPage]);

  return {
    name: draft.name,
    bio: draft.bio,
    bento: draft.bento,
    setName,
    setBio,
    setBento,
  };
};
