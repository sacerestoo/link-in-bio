import type { PageResponse, PageUpdate } from "@grabbin/shared/schemas/page";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { profileQueries } from "../queries";

type ProfileValues = Readonly<{ name: string; bio: string }>;
type ProfileField = keyof ProfileValues;
type AutosaveState = {
  values: ProfileValues;
  saved: ProfileValues;
  timer: ReturnType<typeof setTimeout> | undefined;
  indicatorTimer: ReturnType<typeof setTimeout> | undefined;
  inFlight: boolean;
  queued: boolean;
  mounted: boolean;
};
type StateRef = { current: AutosaveState };
type SaveRef = { current: () => Promise<void> };
type SaveContext = Readonly<{
  handle: string;
  stateRef: StateRef;
  saveUpdate: (update: PageUpdate) => Promise<void>;
  queryClient: ReturnType<typeof useQueryClient>;
  setValues: (values: ProfileValues) => void;
  setIsSaving: (isSaving: boolean) => void;
  saveRef: SaveRef;
}>;

const DEBOUNCE_MS = 1500;
const SAVE_INDICATOR_DURATION_MS = 1000;

const toValues = ({ name, bio }: PageResponse): ProfileValues => ({
  name: name ?? "",
  bio: bio ?? "",
});

const toUpdate = (values: ProfileValues, saved: ProfileValues): PageUpdate => ({
  ...(values.name === saved.name ? {} : { name: values.name || null }),
  ...(values.bio === saved.bio ? {} : { bio: values.bio || null }),
});

const hasChanges = (state: AutosaveState): boolean =>
  state.values.name !== state.saved.name ||
  state.values.bio !== state.saved.bio;

const applyUpdate = (
  saved: ProfileValues,
  update: PageUpdate,
): ProfileValues => ({
  name: update.name === undefined ? saved.name : (update.name ?? ""),
  bio: update.bio === undefined ? saved.bio : (update.bio ?? ""),
});

const updateProfileCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  handle: string,
  values: ProfileValues,
): void => {
  queryClient.setQueryData<PageResponse>(
    profileQueries.byHandle(handle),
    (page) =>
      page === undefined
        ? undefined
        : { ...page, name: values.name || null, bio: values.bio || null },
  );
};

const hideSavingIndicatorLater = (
  state: AutosaveState,
  setIsSaving: (isSaving: boolean) => void,
): void => {
  if (!state.mounted) return;
  if (state.indicatorTimer !== undefined) clearTimeout(state.indicatorTimer);
  state.indicatorTimer = setTimeout(() => {
    state.indicatorTimer = undefined;
    if (state.mounted) setIsSaving(false);
  }, SAVE_INDICATOR_DURATION_MS);
};

const hideSavingIndicator = (
  state: AutosaveState,
  setIsSaving: (isSaving: boolean) => void,
): void => {
  if (state.indicatorTimer !== undefined) clearTimeout(state.indicatorTimer);
  state.indicatorTimer = undefined;
  if (state.mounted) setIsSaving(false);
};

const reconcileFailedSave = async (
  context: SaveContext,
  snapshot: ProfileValues,
): Promise<void> => {
  const { handle, queryClient, stateRef, setValues } = context;
  await queryClient.invalidateQueries(
    { queryKey: profileQueries.byHandle(handle) },
    { throwOnError: true },
  );
  const page = queryClient.getQueryData<PageResponse>(
    profileQueries.byHandle(handle),
  );
  if (page === undefined) throw new Error("Could not reload the page.");

  const serverValues = toValues(page);
  const latest = stateRef.current.values;
  const rebased = {
    name: latest.name === snapshot.name ? serverValues.name : latest.name,
    bio: latest.bio === snapshot.bio ? serverValues.bio : latest.bio,
  };
  stateRef.current.saved = serverValues;
  stateRef.current.values = rebased;
  if (stateRef.current.mounted) setValues(rebased);
};

const persistUpdate = async (
  context: SaveContext,
  snapshot: ProfileValues,
  update: PageUpdate,
): Promise<boolean> => {
  try {
    await context.saveUpdate(update);
    context.stateRef.current.saved = applyUpdate(
      context.stateRef.current.saved,
      update,
    );
    updateProfileCache(
      context.queryClient,
      context.handle,
      context.stateRef.current.saved,
    );
    return true;
  } catch (cause: unknown) {
    try {
      await reconcileFailedSave(context, snapshot);
    } catch {
      // Keep the draft when the server state cannot be reloaded.
    }
    toast.add({
      title: "Profile update failed",
      description: cause instanceof Error ? cause.message : "Please try again.",
      type: "error",
    });
    return false;
  }
};

const runSave = async (context: SaveContext): Promise<void> => {
  const { stateRef, setIsSaving, saveRef } = context;
  const state = stateRef.current;
  if (state.inFlight) {
    state.queued = true;
    return;
  }

  const snapshot = state.values;
  const update = toUpdate(snapshot, state.saved);
  if (Object.keys(update).length === 0) {
    hideSavingIndicator(state, setIsSaving);
    return;
  }

  if (state.indicatorTimer !== undefined) clearTimeout(state.indicatorTimer);
  state.indicatorTimer = undefined;
  state.inFlight = true;
  if (state.mounted) setIsSaving(true);
  const saved = await persistUpdate(context, snapshot, update);
  state.inFlight = false;
  if (state.queued) {
    state.queued = false;
    void saveRef.current();
  } else if (saved) {
    hideSavingIndicatorLater(state, setIsSaving);
  } else {
    hideSavingIndicator(state, setIsSaving);
  }
};

const scheduleSave = (
  state: AutosaveState,
  save: () => Promise<void>,
): void => {
  if (state.timer !== undefined) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = undefined;
    void save();
  }, DEBOUNCE_MS);
};

const updateDraft = (
  field: ProfileField,
  value: string,
  stateRef: StateRef,
  setValues: (values: ProfileValues) => void,
  setIsSaving: (isSaving: boolean) => void,
  saveRef: SaveRef,
): void => {
  const state = stateRef.current;
  const values = { ...state.values, [field]: value };
  state.values = values;
  setValues(values);
  if (!state.inFlight) {
    hideSavingIndicator(state, setIsSaving);
  }
  scheduleSave(state, saveRef.current);
};

const useAutosaveLifecycle = (
  stateRef: StateRef,
  saveRef: SaveRef,
  save: () => Promise<void>,
): void => {
  useEffect(() => {
    const state = stateRef.current;
    saveRef.current = save;
    state.mounted = true;
    return () => {
      state.mounted = false;
      if (state.timer !== undefined) clearTimeout(state.timer);
      if (state.indicatorTimer !== undefined)
        clearTimeout(state.indicatorTimer);
      if (hasChanges(state)) {
        if (state.inFlight) state.queued = true;
        else void save();
      }
    };
  }, [save, saveRef, stateRef]);
};

export const useProfileAutosave = (
  handle: string,
  initialValues: ProfileValues,
) => {
  const [values, setValues] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const stateRef = useRef<AutosaveState>({
    values: initialValues,
    saved: initialValues,
    timer: undefined,
    indicatorTimer: undefined,
    inFlight: false,
    queued: false,
    mounted: true,
  });
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const mutation = useMutation(profileQueries.updateProfile(handle));
  const queryClient = useQueryClient();
  const save = useCallback(
    () =>
      runSave({
        handle,
        stateRef,
        saveUpdate: mutation.mutateAsync,
        queryClient,
        setValues,
        setIsSaving,
        saveRef,
      }),
    [handle, mutation.mutateAsync, queryClient],
  );

  useAutosaveLifecycle(stateRef, saveRef, save);

  const setName = useCallback((value: string) => {
    updateDraft("name", value, stateRef, setValues, setIsSaving, saveRef);
  }, []);
  const setBio = useCallback((value: string) => {
    updateDraft("bio", value, stateRef, setValues, setIsSaving, saveRef);
  }, []);

  return { ...values, isSaving, setName, setBio };
};
