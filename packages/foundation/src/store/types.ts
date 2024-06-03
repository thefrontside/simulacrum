export type RecursivePartial<T> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  [P in keyof T]?: RecursivePartial<T[P]>;
};

export type ReturnTypes<T extends Record<string, () => any>> = {
  [K in keyof T]: ReturnType<T[K]>;
};
