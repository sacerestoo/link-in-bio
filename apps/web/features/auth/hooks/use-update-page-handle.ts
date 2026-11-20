import type { PageResponse } from "@grabbin/shared/schemas/page";
import { profileQueries } from "@/features/profile/queries";
import { api as browserApi } from "@/lib/api-client";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const useUpdatePageHandle = (
  currentHandle: string,
  onSaved: () => void,
) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation(
    profileQueries.changeHandle(
      currentHandle,
      {
        onSuccess: (updatedHandle) => {
          const page = queryClient.getQueryData<PageResponse>(
            profileQueries.byHandle(currentHandle),
          );
          if (page !== undefined) {
            const updatedPage = { ...page, handle: updatedHandle };
            queryClient.setQueryData(
              profileQueries.byHandle(currentHandle),
              updatedPage,
            );
            queryClient.setQueryData(
              profileQueries.byHandle(updatedHandle),
              updatedPage,
            );
          }
          onSaved();
          router.replace(`/${encodeURIComponent(updatedHandle)}`, {
            scroll: false,
          });
        },
        onError: (cause) => {
          toast.add({
            title: "Handle change failed",
            description:
              cause instanceof Error ? cause.message : "Please try again.",
            type: "error",
          });
        },
      },
      browserApi,
    ),
  );
};
