import type {
  Handle,
  PageResponse,
  PageUpdate,
} from "@grabbin/shared/schemas/page";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { debounce, type DebouncedFunction } from "es-toolkit/function";
import { useCallback, useEffect, useRef, useState } from "react";
import { profileMutations } from "../mutations";
import { profileQueries, type ProfilePageData } from "../queries";

type ProfileValues = Readonly<Pick<ProfilePageData, "name" | "bio">>;
type AutosaveState = {
  draft: ProfileValues;
  saved: ProfileValues;
  isSaveInFlight: boolean;
  hasQueuedSave: boolean;
};
type AutosaveStateRef = { current: AutosaveState };
type SaveProfileRef = { current: () => Promise<void> };
type SaveContext = Readonly<{
  handle: Handle;
  stateRef: AutosaveStateRef;
  onProfileUpdate: (update: PageUpdate) => Promise<void>;
  queryClient: ReturnType<typeof useQueryClient>;
  saveRef: SaveProfileRef;
}>;

const DEBOUNCE_MS = 1500;

const createUpdate = (
  draft: ProfileValues,
  saved: ProfileValues,
): PageUpdate => ({
  ...(draft.name === saved.name ? {} : { name: draft.name || null }),
  ...(draft.bio === saved.bio ? {} : { bio: draft.bio || null }),
});

const applyUpdate = (
  saved: ProfileValues,
  update: PageUpdate,
): ProfileValues => ({
  name: update.name === undefined ? saved.name : (update.name ?? ""),
  bio: update.bio === undefined ? saved.bio : (update.bio ?? ""),
});

const hasChanges = (state: AutosaveState): boolean =>
  state.draft.name !== state.saved.name || state.draft.bio !== state.saved.bio;

const reloadSavedValues = async ({
  handle,
  queryClient,
  stateRef,
}: SaveContext): Promise<void> => {
  await queryClient.invalidateQueries(
    { queryKey: profileQueries.byHandle(handle) },
    { throwOnError: true },
  );
  const page = queryClient.getQueryData<PageResponse>(
    profileQueries.byHandle(handle),
  );
  if (page === undefined) return;

  const state = stateRef.current;
  state.saved = { name: page.name ?? "", bio: page.bio ?? "" };
};

const persistProfileDraft = async (
  context: SaveContext,
  update: PageUpdate,
): Promise<void> => {
  const { handle, queryClient, stateRef, onProfileUpdate } = context;
  const state = stateRef.current;
  try {
    await onProfileUpdate(update);
    state.saved = applyUpdate(state.saved, update);
    queryClient.setQueryData<PageResponse>(
      profileQueries.byHandle(handle),
      (page) =>
        page === undefined
          ? undefined
          : {
              ...page,
              name: state.saved.name || null,
              bio: state.saved.bio || null,
            },
    );
  } catch (cause: unknown) {
    try {
      await reloadSavedValues(context);
    } catch {
      // Keep the draft if the server state cannot be reloaded.
    }
    toast.add({
      title: "Profile update failed",
      description: cause instanceof Error ? cause.message : "Please try again.",
      type: "error",
    });
  }
};

const saveLatestDraft = async (context: SaveContext): Promise<void> => {
  const { stateRef, saveRef } = context;
  const state = stateRef.current;
  if (state.isSaveInFlight) {
    state.hasQueuedSave = true;
    return;
  }

  const submittedDraft = state.draft;
  const update = createUpdate(submittedDraft, state.saved);
  if (Object.keys(update).length === 0) return;

  state.isSaveInFlight = true;
  await persistProfileDraft(context, update);
  state.isSaveInFlight = false;

  if (state.hasQueuedSave) {
    state.hasQueuedSave = false;
    await saveRef.current();
  }
};

const useProfileSaveDebounce = (
  stateRef: AutosaveStateRef,
  saveRef: SaveProfileRef,
  onSave: () => Promise<void>,
) => {
  const debouncedSaveRef = useRef<DebouncedFunction<() => void> | null>(null);

  useEffect(() => {
    const state = stateRef.current;
    const debouncedSave = debounce(() => void saveRef.current(), DEBOUNCE_MS);
    debouncedSaveRef.current = debouncedSave;
    saveRef.current = onSave;

    return () => {
      debouncedSave.cancel();
      if (hasChanges(state)) {
        if (state.isSaveInFlight) state.hasQueuedSave = true;
        else void saveRef.current();
      }
    };
  }, [onSave, saveRef, stateRef]);

  return debouncedSaveRef;
};

export const useProfileAutosave = (
  handle: Handle,
  initialValues: ProfileValues,
) => {
  const [values, setValues] = useState(initialValues);
  const stateRef = useRef<AutosaveState>({
    draft: initialValues,
    saved: initialValues,
    isSaveInFlight: false,
    hasQueuedSave: false,
  });
  const saveRef = useRef<SaveProfileRef["current"]>(async () => {});
  const { mutateAsync: updateProfile } = useMutation(
    profileMutations.updateProfile(handle),
  );
  const queryClient = useQueryClient();
  const save = useCallback(
    () =>
      saveLatestDraft({
        handle,
        stateRef,
        onProfileUpdate: updateProfile,
        queryClient,
        saveRef,
      }),
    [handle, queryClient, updateProfile],
  );
  const debouncedSaveRef = useProfileSaveDebounce(stateRef, saveRef, save);
  const updateDraft = <Field extends keyof ProfileValues>(
    field: Field,
    value: ProfileValues[Field],
  ) => {
    const state = stateRef.current;
    state.draft = { ...state.draft, [field]: value };
    setValues(state.draft);
    debouncedSaveRef.current?.();
  };
  const setName = (name: ProfileValues["name"]) => {
    updateDraft("name", name);
  };
  const setBio = (bio: ProfileValues["bio"]) => {
    updateDraft("bio", bio);
  };

  return { ...values, setName, setBio };
};
