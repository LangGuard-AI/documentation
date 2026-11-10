import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence, motion, MotionConfig} from 'motion/react';
import type {Transition} from 'motion/react';
import {X} from 'lucide-react';

import useClickOutside from '@/hooks/useClickOutside';
import {cn} from '@/lib/utils';

type MorphingDialogContextType = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const MorphingDialogContext = createContext<MorphingDialogContextType | null>(
  null,
);

function useMorphingDialog() {
  const context = useContext(MorphingDialogContext);
  if (!context) {
    throw new Error('useMorphingDialog must be used within a MorphingDialog');
  }
  return context;
}

export function MorphingDialog({
  children,
  transition,
}: {
  children: React.ReactNode;
  transition?: Transition;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const value = useMemo(
    () => ({isOpen, setIsOpen, uniqueId, triggerRef}),
    [isOpen, uniqueId],
  );
  return (
    <MorphingDialogContext.Provider value={value}>
      <MotionConfig transition={transition} reducedMotion="user">
        {children}
      </MotionConfig>
    </MorphingDialogContext.Provider>
  );
}

export function MorphingDialogTrigger({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  const {setIsOpen, isOpen, uniqueId, triggerRef} = useMorphingDialog();
  return (
    <motion.button
      ref={triggerRef}
      type="button"
      layoutId={`dialog-${uniqueId}`}
      className={className}
      onClick={() => setIsOpen(true)}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={label}
    >
      {children}
    </motion.button>
  );
}

export function MorphingDialogContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const {isOpen, uniqueId} = useMorphingDialog();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence initial={false} mode="sync">
      {isOpen && (
        <React.Fragment key={uniqueId}>
          <motion.div
            className="bg-background/80 fixed inset-0 z-[300] backdrop-blur-xs"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
          />
          <div className="fixed inset-0 z-[301] flex items-center justify-center">
            {children}
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function MorphingDialogContent({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  const {setIsOpen, isOpen, uniqueId, triggerRef} = useMorphingDialog();
  const containerRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
      if (event.key === 'Tab') event.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
      containerRef.current.querySelector('button')?.focus();
    } else {
      document.body.classList.remove('overflow-hidden');
      triggerRef.current?.focus();
    }
  }, [isOpen, triggerRef]);

  useClickOutside(containerRef, () => setIsOpen(false));

  return (
    <motion.div
      ref={containerRef}
      layoutId={`dialog-${uniqueId}`}
      className={cn('overflow-hidden', className)}
      style={{borderRadius: 12}}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </motion.div>
  );
}

export function MorphingDialogTriggerImage({className}: {className?: string}) {
  const {triggerRef} = useMorphingDialog();
  const [image] = useState(() => {
    const shown = triggerRef.current?.querySelector('img');
    return {src: shown?.currentSrc || shown?.src, alt: shown?.alt ?? ''};
  });
  return <img src={image.src} alt={image.alt} className={className} />;
}

export function MorphingDialogClose({className}: {className?: string}) {
  const {setIsOpen} = useMorphingDialog();
  return (
    <motion.button
      type="button"
      aria-label="Close"
      onClick={() => setIsOpen(false)}
      className={className}
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
    >
      <X size={16} aria-hidden="true" />
    </motion.button>
  );
}
