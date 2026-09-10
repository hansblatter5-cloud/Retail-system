"use client";

import { useEffect, useState } from "react";
import { api, StoreSettings } from "@/lib/api";
import { Info, X, Mail, MapPin, MessageCircle, Facebook, Instagram, Twitter } from "lucide-react";

// lucide-react has no official TikTok glyph — inline outline icon, sized to
// match the other 20px social icons.
function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-.9-.95-1.4-2.19-1.4-3.47h-3.3v13.66c0 1.5-1.22 2.72-2.72 2.72a2.72 2.72 0 0 1 0-5.44c.27 0 .53.04.78.11V10.3a6.03 6.03 0 0 0-.78-.05A6.02 6.02 0 0 0 3.16 16.3 6.02 6.02 0 0 0 9.18 22.3a6.02 6.02 0 0 0 6.02-6.02V9.4a9.3 9.3 0 0 0 5.44 1.74V7.83c-1.5 0-2.88-.5-3.99-1.34-.34-.24-.65-.42-.05-.67Z" />
    </svg>
  );
}

export function StoreInfoSidebar() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    // Fetched once on mount; this info changes rarely, no need to refetch on open.
    api.get<StoreSettings>("/settings").then(setSettings).catch(() => {});
  }, []);

  if (!settings) return null;

  const socials = [
    { href: settings.whatsappUrl, icon: MessageCircle, label: "WhatsApp" },
    { href: settings.facebookUrl, icon: Facebook, label: "Facebook" },
    { href: settings.instagramUrl, icon: Instagram, label: "Instagram" },
    { href: settings.xUrl, icon: Twitter, label: "X" },
    { href: settings.tiktokUrl, icon: TikTokIcon, label: "TikTok" },
  ].filter((s) => s.href);

  return (
    <>
      {/* Trigger — fixed so it's reachable with a thumb on mobile regardless of scroll position. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Store info & contact"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-teal text-white shadow-elev-lg transition-colors hover:bg-teal-deep sm:bottom-6 sm:right-6"
      >
        <Info size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          {/* Panel — full width on mobile, fixed width from sm up */}
          <aside className="relative flex h-full w-full flex-col overflow-y-auto bg-white shadow-elev-lg sm:w-96">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="font-display text-lg font-bold text-ink">Visit / Contact Us</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-6 px-6 py-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Owner</p>
                <p className="mt-1 font-medium text-ink">{settings.ownerName}</p>
              </div>

              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-teal" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Visit the shop</p>
                  <p className="mt-1 text-sm text-ink/80">{settings.locationName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={18} className="mt-0.5 shrink-0 text-teal" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Email</p>
                  <a href={`mailto:${settings.contactEmail}`} className="mt-1 block text-sm text-teal underline underline-offset-4">
                    {settings.contactEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageCircle size={18} className="mt-0.5 shrink-0 text-teal" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">WhatsApp</p>
                  <a
                    href={settings.whatsappUrl ?? `https://wa.me/${settings.whatsappNumber.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm text-teal underline underline-offset-4"
                  >
                    {settings.whatsappNumber}
                  </a>
                </div>
              </div>

              {socials.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">
                    Follow us — {settings.socialHandle}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {socials.map(({ href, icon: Icon, label }) => (
                      <a
                        key={label}
                        href={href!}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink/70 transition-colors hover:border-teal hover:text-teal"
                      >
                        <Icon size={18} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-line pt-5">
                <p className="text-xs uppercase tracking-wide text-ink/50">Return Policy</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{settings.returnPolicy}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
