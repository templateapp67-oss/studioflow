/**
 * Version of the privacy notice shown next to the landing-page enquiry forms.
 *
 * The browser sends this value with every enquiry and the Edge Function
 * stamps the version that was actually in force when the request was
 * received. The shared constant keeps the browser copy and the server copy
 * from drifting apart.
 */
export const NEXORA_PRIVACY_NOTICE_VERSION = '2026-11';
