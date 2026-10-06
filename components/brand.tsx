import { Send } from "lucide-react";
import { TELEGRAM_URL, PUBLIC_SITE_URL, SITE_ROLE } from "@/lib/config";
export function Brand() {
  return <a className="brand" href={SITE_ROLE==="admin"?PUBLIC_SITE_URL:"/"} aria-label="Movies for You home"><img src="/logo.png" width="52" height="52" alt="" /><span>movies<span className="brand-gold">for</span>you<small>A LITTLE CINEMA, EVERY DAY</small></span></a>;
}
export function TelegramLink({ className = "button telegram-button", children = <><span className="desktop-link-label">Join Telegram</span><span className="mobile-link-label">Telegram</span></> }: { className?: string; children?: React.ReactNode }) {
  return <a className={className} href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer"><Send size={17} aria-hidden="true" />{children}</a>;
}
export function SiteFooter() {
  return <footer className="site-footer"><span>© {new Date().getFullYear()} Movies for You</span><div><a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Telegram channel</a></div></footer>;
}
