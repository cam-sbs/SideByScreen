"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingText?: ReactNode;
};

export function ButtonWithLoading({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className = "",
  ...rest
}: Props) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={isLoading || undefined}
      className={className}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <Spinner size="sm" />
          <span>{loadingText ?? children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
