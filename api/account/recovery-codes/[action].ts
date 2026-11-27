import type { Request, Response } from 'express';
import { makeSecurityCenterHandler } from '../../../server/securityCenter.mjs';
import { recoveryActiveHandler, recoveryConsumeHandler } from '../../../server/recoveryCodes.js';

const securityCenterHandler = makeSecurityCenterHandler();

export default function accountSecurityHandler(req: Request, res: Response) {
  const path = req.url?.split('?', 1)[0];

  switch (path) {
    case '/api/security-center':
    case '/api/account/recovery-codes/security-center':
      return securityCenterHandler(req, res);
    case '/api/account/recovery-codes/active':
      return recoveryActiveHandler(req, res);
    case '/api/account/recovery-codes/consume':
      return recoveryConsumeHandler(req, res);
    default:
      res.setHeader?.('Cache-Control', 'no-store');
      return res.status(404).json({ error: 'Unknown API endpoint' });
  }
}
