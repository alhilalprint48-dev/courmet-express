'use client';
import { useEffect, useRef } from 'react';

type Turnstile = { render: (node: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
export function CheckoutCaptcha({ onToken, language }: { onToken: (token: string | null) => void; language: 'fr' | 'ar' }) {
  const container=useRef<HTMLDivElement>(null);
  const sitekey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(()=>{
    if(!sitekey) return;
    let active=true, widget: string | undefined;
    const mount=()=>{
      if(!active||!container.current||!window.turnstile||widget) return;
      widget=window.turnstile.render(container.current,{sitekey,action:'checkout',language,
        callback:(token: string)=>onToken(token),'expired-callback':()=>onToken(null),'error-callback':()=>onToken(null),theme:'light',size:'flexible'});
    };
    let script=document.querySelector<HTMLScriptElement>('script[data-checkout-turnstile]');
    if(!script){ script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.dataset.checkoutTurnstile='true';document.head.appendChild(script); }
    script.addEventListener('load',mount);mount();
    return ()=>{active=false;onToken(null);script?.removeEventListener('load',mount);if(widget&&window.turnstile)window.turnstile.remove(widget);};
  },[sitekey,onToken,language]);
  return <div className="space-y-2">
    <p className="text-xs text-gray-600">{language==='ar'?'أكد بلي ماشي روبو باش تصيفط الطلب.':'Validez le contrôle anti-robot pour envoyer votre commande.'}</p>
    <div ref={container} />
    {!sitekey&&<p role="alert" className="text-xs text-red-700">{language==='ar'?'التحقق ما خدامش دابا. تاصل بالمطعم.':'Validation indisponible. Contactez le restaurant.'}</p>}
  </div>;
}
