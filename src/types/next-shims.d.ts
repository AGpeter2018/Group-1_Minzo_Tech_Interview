// Next.js 16 Canary module declaration shims
declare module 'next/types.js' {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
  export type Metadata = any;
  export type Viewport = any;
}

declare module 'next/server.js' {
  export type NextRequest = any;
  export type NextResponse = any;
}
