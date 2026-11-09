import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

const MIN_VISIBLE_MS = 450;
const BREAKPOINT = /^(sm:|md:|lg:|xl:|2xl:)/;

function bare(token) {
  return token.replace(BREAKPOINT, '');
}

function isFrameToken(token) {
  const base = bare(token);
  if (/^(absolute|relative|sticky|fixed|inset-0|inset-x-0|inset-y-0|top-0|right-0|bottom-0|left-0|w-full|h-full|w-auto|h-auto|min-w-full|shrink-0|block|inline-block)$/.test(base)) {
    return true;
  }
  return /^(w-|h-|min-w-|min-h-|max-w-|max-h-|aspect-|rounded-|basis-)/.test(base);
}

function hasExplicitBox(tokens) {
  return tokens.some((token) => {
    const base = bare(token);
    return base === 'absolute' || base === 'inset-0' || /^(h-|min-h-|aspect-)/.test(base);
  });
}

export function LoadingImage({ className = '', src, alt = '', onLoad, onError, ...rest }) {
  const [decoded, setDecoded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    setDecoded(false);
    setRevealed(false);
    startedAt.current = Date.now();
  }, [src]);

  useEffect(() => {
    if (!decoded) return undefined;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    const timer = setTimeout(() => setRevealed(true), wait);
    return () => clearTimeout(timer);
  }, [decoded, src]);

  useEffect(() => {
    if (!src) setDecoded(true);
  }, [src]);

  const tokens = String(className).split(/\s+/).filter(Boolean);
  const frameTokens = tokens.filter(isFrameToken);
  const autoWidth = frameTokens.some((token) => bare(token) === 'w-auto');
  const holdSpace = !revealed && !hasExplicitBox(frameTokens);

  return (
    <span
      className={cn(
        'loading-image-frame overflow-hidden',
        'relative',
        frameTokens,
        autoWidth ? 'inline-block' : 'block',
        holdSpace && 'min-h-48 w-full'
      )}
    >
      {!revealed && (
        <span className="image-placeholder" aria-hidden="true">
          <span className="image-placeholder__mark" />
        </span>
      )}
      {src ? (
      <img
        {...rest}
        src={src}
        alt={alt}
        data-loaded={revealed ? 'true' : 'false'}
        className={className}
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth > 0) setDecoded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          if (onError && event.currentTarget.dataset.fallback !== '1') {
            event.currentTarget.dataset.fallback = '1';
            onError(event);
            return;
          }
          setDecoded(true);
        }}
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setDecoded(true);
        }}
      />
      ) : null}
    </span>
  );
}
