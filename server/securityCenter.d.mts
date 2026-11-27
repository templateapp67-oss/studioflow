import type { Request, Response } from 'express';

export type SecurityCenterHandler = (request: Request, response: Response) => Promise<unknown>;
export function makeSecurityCenterHandler(options?: unknown): SecurityCenterHandler;
