import type { ReactNode } from "react";

type RouteParams = Record<string, string | string[] | undefined>;

declare global {
  interface PageProps<_TPath extends string = string> {
    params: Promise<RouteParams> | RouteParams;
    searchParams?: Promise<RouteParams> | RouteParams;
  }

  interface LayoutProps<_TPath extends string = string> {
    children: ReactNode;
  }

  interface RouteContext<_TPath extends string = string> {
    params: Promise<RouteParams> | RouteParams;
  }
}

export {};
