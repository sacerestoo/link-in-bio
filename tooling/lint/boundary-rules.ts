import { definePlugin } from "vite-plus/lint/plugins";
import { serverActionInput } from "./boundary/actions.ts";
import {
  contractExplicitPick,
  contractFromContractsModule,
  noRawBodyRead,
} from "./boundary/contracts.ts";
import { noReExport } from "./boundary/re-export.ts";

export default definePlugin({
  meta: { name: "boundary" },
  rules: {
    "no-raw-body-read": noRawBodyRead,
    "contract-from-contracts-module": contractFromContractsModule,
    "server-action-input": serverActionInput,
    "contract-explicit-pick": contractExplicitPick,
    "no-re-export": noReExport,
  },
});
