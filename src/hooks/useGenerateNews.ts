import { useMutation } from "@tanstack/react-query";
import {
  generateNews,
  type GenerateNewsInput,
} from "@/lib/news-parsers";
import type { GenerateResult } from "@/lib/parsers";

export function useGenerateNews(
  onSuccess?: (result: GenerateResult) => void,
  onError?: (error: Error) => void
) {
  return useMutation<GenerateResult, Error, GenerateNewsInput>({
    mutationFn: generateNews,
    onSuccess,
    onError,
  });
}
