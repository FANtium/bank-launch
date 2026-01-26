export type SetOptional<T, K extends keyof T> = Partial<Omit<T, K>> & Required<Pick<T, K>>;
