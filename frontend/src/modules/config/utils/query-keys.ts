export const configQueryKeys = {
  all: ["config"] as const,
  details: () => [...configQueryKeys.all, "details"] as const,
};
