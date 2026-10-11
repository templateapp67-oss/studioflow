// Minimal local type declarations for the deployed Deno Edge runtime.
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Response|Promise<Response>):void};
