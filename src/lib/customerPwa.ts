type InstallEvent = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
let prompt:InstallEvent|null=null;
export const canInstallCustomerApp=()=>!!prompt;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event as InstallEvent;window.dispatchEvent(new Event('nexora-install-change'));});
window.addEventListener('appinstalled',()=>{prompt=null;window.dispatchEvent(new Event('nexora-install-change'));});
export async function installCustomerApp(){if(!prompt)return false;const pending=prompt;prompt=null;window.dispatchEvent(new Event('nexora-install-change'));await pending.prompt();return (await pending.userChoice).outcome==='accepted';}
export function registerCustomerPwa(){if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',()=>{navigator.serviceWorker.register('/customer-sw.js',{scope:'/',updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{/* Online browsing remains available. */});});}
