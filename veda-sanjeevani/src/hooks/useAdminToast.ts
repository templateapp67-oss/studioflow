import { useContext } from 'react';
import { ToastContext } from './adminToastContext';

export function useAdminToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('AdminToastProvider is missing.');
  return value.notify;
}
