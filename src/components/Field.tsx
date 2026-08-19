import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

export function Field({ label, children, required, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow bg-white';

export const selectCls = inputCls;

export const textareaCls = `${inputCls} resize-y min-h-[60px]`;
