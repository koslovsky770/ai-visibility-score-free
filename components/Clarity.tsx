import Script from "next/script";
import { CLARITY_PROJECT_ID } from "@/lib/config";

/**
 * Microsoft Clarity (free): heatmaps, session recordings, and the funnel's
 * custom events (forwarded from lib/analytics.ts). Renders nothing until a
 * project id is set in lib/config.ts.
 */
export function Clarity() {
  if (!CLARITY_PROJECT_ID) return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_PROJECT_ID)});`}
    </Script>
  );
}
