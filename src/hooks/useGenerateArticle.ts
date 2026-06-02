import { useMutation } from "@tanstack/react-query";
import { generateArticle, type GenerateInput, type GenerateResult } from "@/lib/parsers";

export function useGenerateArticle(
  onSuccess?: (result: GenerateResult) => void,
  onError?: (error: Error) => void
) {
  return useMutation<GenerateResult, Error, GenerateInput>({
    mutationFn: generateArticle,
    onSuccess,
    onError,
  });
}
