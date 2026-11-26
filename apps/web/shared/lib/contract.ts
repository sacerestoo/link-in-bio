import * as v from "valibot";

export const readJson = async <Schema extends v.GenericSchema>(
  contract: Schema,
  response: Pick<Response, "json">,
): Promise<v.InferOutput<Schema>> => v.parse(contract, await response.json());
