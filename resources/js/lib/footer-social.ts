export const FOOTER_SOCIAL_TYPES = {instagram:'Instagram',email:'Email',phone:'Telepon',whatsapp:'WhatsApp',youtube:'YouTube',facebook:'Facebook',linkedin:'LinkedIn',website:'Website'};
export type FooterSocial = {type:keyof typeof FOOTER_SOCIAL_TYPES;href:string};
export const DEFAULT_FOOTER_SOCIAL: FooterSocial[] = [{type:'instagram',href:''},{type:'email',href:''},{type:'phone',href:''}];
export function footerSocialHref(item: FooterSocial, settings: any): string {
    if(item.href.trim())return item.href.trim();
    if(item.type==='instagram'&&settings?.instagram)return `https://instagram.com/${settings.instagram.replace(/^@/,'')}`;
    if(item.type==='email'&&settings?.email)return `mailto:${settings.email}`;
    if(item.type==='phone'&&settings?.phone)return `tel:${settings.phone.replace(/[^\d+]/g,'')}`;
    return '';
}
