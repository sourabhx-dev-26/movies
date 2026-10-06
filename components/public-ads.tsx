"use client";
import { useEffect, useRef, useState } from "react";
import { GLOBAL_AD_SCRIPT, NATIVE_AD_CONTAINER, NATIVE_AD_SCRIPT } from "@/lib/ad-config";

function insertScript(id: string, source: string, parent: HTMLElement, onError?: () => void) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id; script.src = source; script.async = true;
  script.setAttribute("data-cfasync", "false");
  if (onError) script.onerror = onError;
  parent.appendChild(script);
}

// The first supplied code has no inline container, so it is loaded once globally.
export function PublicAdScript() {
  useEffect(() => {
    let cancelled = false;
    const start = () => { if (!cancelled) insertScript("mfy-global-ad-script", GLOBAL_AD_SCRIPT, document.body); };
    const timer = window.setTimeout(start, 1000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);
  return null;
}

// This placement stays mounted when movie search results change.
export function NativeAd() {
  const placement = useRef<HTMLElement>(null);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(() => {
    const element = placement.current;
    if (!element) return;
    const start = () => insertScript("mfy-native-ad-script", NATIVE_AD_SCRIPT, element,()=>setUnavailable(true));
    if (!("IntersectionObserver" in window)) { start(); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
    }, { rootMargin: "200px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <aside className="ad-placement" ref={placement} aria-label="Advertisement" hidden={unavailable}>
    <div className="ad-placement-label">Advertisement <a href="https://adsterra.com/privacy-policy/" target="_blank" rel="noopener noreferrer">Ad privacy</a></div>
    <div id={NATIVE_AD_CONTAINER} className="native-ad-container" />
  </aside>;
}
