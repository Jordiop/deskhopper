import { usePromise } from "@raycast/utils";
import { getAerospaceSnapshot } from "./aerospace";

export function useAerospaceState() {
  const { data, isLoading, error, revalidate } = usePromise(getAerospaceSnapshot, []);
  return { workspaces: data ?? [], isLoading, error, revalidate };
}
