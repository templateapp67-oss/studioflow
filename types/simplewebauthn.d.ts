declare module '@simplewebauthn/server' {
  export function generateRegistrationOptions(options: any): Promise<any>;
  export function verifyRegistrationResponse(options: any): Promise<any>;
  export function generateAuthenticationOptions(options: any): Promise<any>;
  export function verifyAuthenticationResponse(options: any): Promise<any>;
}
