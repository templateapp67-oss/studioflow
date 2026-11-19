declare module 'npm:@simplewebauthn/server@14.1.0' {
  export function generateRegistrationOptions(options: any): Promise<any>;
  export function verifyRegistrationResponse(options: any): Promise<any>;
  export function generateAuthenticationOptions(options: any): Promise<any>;
  export function verifyAuthenticationResponse(options: any): Promise<any>;
}
