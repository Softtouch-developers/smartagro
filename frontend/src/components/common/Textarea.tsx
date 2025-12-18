import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  showCount?: boolean;
  maxLength?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      fullWidth = true,
      resize = 'vertical',
      showCount = false,
      maxLength,
      className = '',
      value,
      ...props
    },
    ref
  ) => {
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            value={value}
            maxLength={maxLength}
            className={`
              w-full px-4 py-3
              border rounded-lg
              focus:border-primary focus:ring-2 focus:ring-primary/20
              outline-none transition-colors
              min-h-[100px]
              ${resizeClasses[resize]}
              ${error ? 'border-red-500' : 'border-gray-300'}
              ${props.disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          {(error || hint) && (
            <p className={`text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
              {error || hint}
            </p>
          )}
          {showCount && maxLength && (
            <p
              className={`text-xs ml-auto ${
                currentLength >= maxLength ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
