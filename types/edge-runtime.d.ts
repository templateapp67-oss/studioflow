// Minimal local type declarations for the deployed Deno Edge runtime.
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Response|Promise<Response>):void;test(name:string,fn:()=>void|Promise<void>):void};

// Remote Deno imports are resolved by the deployed edge runtime, not by Node's
// module resolution, so the local type check needs their public surface only.
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string; onListen?: (params: { hostname: string; port: number }) => void },
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>,
  ): any;
}


declare module "npm:svix@1" {
  export class Webhook {
    constructor(secret: string);
    verify(payload: string, headers: Record<string, string>): unknown;
  }
}

declare module "https://esm.sh/standardwebhooks@1.0.0" {
  export class Webhook {
    constructor(secret: string);
    verify(payload: string, headers: Record<string, string>): unknown;
  }
}
