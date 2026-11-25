import type { Handle, PageResponse } from "@grabbin/shared/schemas/page";
import { api as browserApi } from "@/lib/api-client";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { pageMutations } from "../mutations";
import { pageQueries } from "../queries";

export const useUpdatePageHandle = (
  currentHandle: Handle,
  onSaved: () => void,
) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation(
    pageMutations.changeHandle(
      currentHandle,
      {
        onSuccess: (updatedHandle) => {
          const page = queryClient.getQueryData<PageResponse>(
            pageQueries.byHandle(currentHandle),
          );
          if (page !== undefined) {
            const updatedPage = { ...page, handle: updatedHandle };
            queryClient.setQueryData(
              pageQueries.byHandle(currentHandle),
              updatedPage,
            );
            queryClient.setQueryData(
              pageQueries.byHandle(updatedHandle),
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
