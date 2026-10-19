declare module 'next/types.js' {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
  export type Metadata = any;
  export type Viewport = any;
}

declare module 'next/server.js' {
  export type NextRequest = any;
  export type NextResponse = any;
  export const NextRequest: any;
  export const NextResponse: any;
}

declare module 'next/server' {
  export type NextRequest = any;
  export type NextResponse = any;
  export const NextRequest: any;
  export const NextResponse: any;
}

declare module 'groq-sdk' {
  const Groq: any;
  export default Groq;
}
