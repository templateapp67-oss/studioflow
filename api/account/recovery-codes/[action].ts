import { recoveryActiveHandler, recoveryConsumeHandler } from '../../../server/recoveryCodes.js';

type Request = Parameters<typeof recoveryActiveHandler>[0] & { url?: string };
type Response = Parameters<typeof recoveryActiveHandler>[1];

export default function recoveryCodesHandler(req: Request, res: Response) {
  const path = req.url?.split('?', 1)[0];

  switch (path) {
    case '/api/account/recovery-codes/active':
      return recoveryActiveHandler(req, res);
    case '/api/account/recovery-codes/consume':
      return recoveryConsumeHandler(req, res);
    default:
      res.setHeader?.('Cache-Control', 'no-store');
      return res.status(404).json({ error: 'Unknown API endpoint' });
  }
}
