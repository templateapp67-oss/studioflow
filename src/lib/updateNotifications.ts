const STORAGE_KEY = 'nexora_update_notifications';
const NOTIFIED_PREFIX = 'nexora_notified_update_';

export type UpdateNotificationState = 'disabled' | 'denied' | 'enabled' | 'unsupported';

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {}
  return null;
}

function getNotificationClass(): typeof Notification | null {
  if (typeof Notification !== 'undefined') return Notification;
  if (typeof window !== 'undefined' && (window as any).Notification) return (window as any).Notification;
  return null;
}

export function updateNotificationState(): UpdateNotificationState {
  const Notif = getNotificationClass();
  if (!Notif) {
    return 'unsupported';
  }
  if (Notif.permission === 'denied') {
    return 'denied';
  }
  try {
    const storage = getStorage();
    const pref = storage?.getItem(STORAGE_KEY);
    if (pref === 'enabled' && Notif.permission === 'granted') {
      return 'enabled';
    }
  } catch {}
  return 'disabled';
}

export async function enableUpdateNotifications(): Promise<'disabled' | 'denied' | 'enabled'> {
  const Notif = getNotificationClass();
  if (!Notif) {
    return 'disabled';
  }
  try {
    const res = await Notif.requestPermission();
    if (res === 'granted') {
      try {
        getStorage()?.setItem(STORAGE_KEY, 'enabled');
      } catch {}
      return 'enabled';
    }
    if (res === 'denied') {
      return 'denied';
    }
  } catch {}
  return 'disabled';
}

export function disableUpdateNotifications(): void {
  try {
    getStorage()?.setItem(STORAGE_KEY, 'disabled');
  } catch {}
}

export async function notifyAppUpdate(version: string): Promise<boolean> {
  if (!version || version.length < 8) return false;
  if (updateNotificationState() !== 'enabled') return false;

  const storage = getStorage();
  const dedupeKey = `${NOTIFIED_PREFIX}${version}`;
  try {
    if (storage?.getItem(dedupeKey)) return false;
  } catch {}

  let targetUrl = '';
  try {
    const loc = typeof window !== 'undefined' ? window.location : (typeof location !== 'undefined' ? location : null);
    if (loc) {
      const url = new URL(loc.href);
      url.searchParams.delete('access_token');
      targetUrl = url.toString();
    }
  } catch {
    targetUrl = '/';
  }

  const title = 'Nexora Update Available';
  const options = {
    body: 'A new version of the app is ready. Click to refresh.',
    tag: `nexora-update-${version}`,
    data: {
      type: 'nexora-update',
      url: targetUrl,
    },
  };

  try {
    const nav = typeof navigator !== 'undefined' ? navigator : (typeof window !== 'undefined' ? window.navigator : null);
    if (nav?.serviceWorker) {
      const reg = await nav.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        try {
          storage?.setItem(dedupeKey, '1');
        } catch {}
        return true;
      }
    }

    const Notif = getNotificationClass();
    if (Notif) {
      new Notif(title, options);
      try {
        storage?.setItem(dedupeKey, '1');
      } catch {}
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
