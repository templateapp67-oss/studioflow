export function whatsappNational(value:string){const digits=value.replace(/\D/g,'');return digits.length===12&&digits.startsWith('91')?digits.slice(2):digits.length===14&&digits.startsWith('0091')?digits.slice(4):digits}
export function validCustomerWhatsApp(value:string){return !value||/^[1-9]\d{9}$/.test(whatsappNational(value))}
export function customerWhatsApp(value:string){return value?'+91'+whatsappNational(value):null}
