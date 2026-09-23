import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Check, Copy, X } from 'lucide-react';
import { GITHUB_URL } from '@/lib/config';

const CONTACT_EMAIL = 'hello@traks.dev';

/**
 * How to reach us, shown in place rather than handing off to a mail client
 * (a mailto: does nothing on machines without one configured). Same content
 * as the dashboard's account-menu modal: the address as selectable text with
 * a copy button, and GitHub issues for bugs and feature requests.
 */
export function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Callers pass inline handlers; keep the latest without re-running the
  // open/close effect (which would re-focus and re-lock scroll every render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const copy = (): void => {
    navigator.clipboard
      .writeText(CONTACT_EMAIL)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard refused (permissions, insecure origin): select the text
        // so a manual copy is one keystroke away.
        const el = document.getElementById('contact-modal-email');
        if (el) window.getSelection()?.selectAllChildren(el);
      });
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D3B4F]/40 px-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            className="relative w-full max-w-md rounded-[24px] bg-white p-6 text-[#3D3B4F] shadow-[0_2px_4px_rgba(61,59,79,0.05),0_20px_48px_rgba(61,59,79,0.14)]"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-[#9B9590] transition-colors hover:bg-[#F2F1ED] hover:text-[#3D3B4F]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#28E99F]/20">
              <img src="/logo.svg" alt="" className="h-6 w-6" />
            </div>
            <h2 id="contact-modal-title" className="text-[18px] font-bold tracking-[-0.01em]">
              Contact the Traks team
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#6E6C7C]">
              A deploy that will not come up, a metric that looks wrong, a feature you wish existed.
              Write to us and we&rsquo;ll get back to you.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[#F2F1ED] py-2 pl-4 pr-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#8C8A99]">
                    Email
                  </p>
                  <p
                    id="contact-modal-email"
                    className="select-all truncate text-[14.5px] font-semibold"
                  >
                    {CONTACT_EMAIL}
                  </p>
                </div>
                <button
                  onClick={copy}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold shadow-[0_0_0_1px_#E6E4DE] transition-colors hover:bg-[#F9F8F6]"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#1FC285]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <a
                href={`${GITHUB_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E6E4DE] px-4 py-3 transition-colors hover:bg-[#F9F8F6]"
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">
                    Report a bug or request a feature
                  </span>
                  <span className="block truncate text-[12px] text-[#9B9590]">
                    Open an issue on GitHub
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9B9590]" />
              </a>
            </div>

            <div className="mt-5 flex justify-end border-t border-[#ECEBE6] pt-4">
              <button
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-full bg-[#28E99F] px-5 text-[13px] font-bold text-[#3D3B4F] transition-all hover:-translate-y-px"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
