import { useMutation } from "@tanstack/react-query";
import {
  generateHyundaiRelease,
  type GenerateHyundaiReleaseInput,
} from "@/lib/hyundai-parsers";
import type { GenerateResult } from "@/lib/parsers";

export function useGenerateHyundaiRelease(
  onSuccess?: (result: GenerateResult) => void,
  onError?: (error: Error) => void
) {
  return useMutation<GenerateResult, Error, GenerateHyundaiReleaseInput>({
    mutationFn: generateHyundaiRelease,
    onSuccess,
    onError,
  });
}
