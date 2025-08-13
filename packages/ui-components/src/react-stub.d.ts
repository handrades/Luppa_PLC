declare module 'react' {
  export interface ReactNode {}
  export type PropsWithChildren<P = unknown> = P & {
    children?: ReactNode | undefined;
  };
}
