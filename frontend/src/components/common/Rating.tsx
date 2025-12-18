import React from 'react';
import { Star } from 'lucide-react';

export interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  onChange?: (value: number) => void;
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  className?: string;
}

const Rating: React.FC<RatingProps> = ({
  value,
  max = 5,
  size = 'md',
  readonly = false,
  onChange,
  showValue = false,
  showCount = false,
  count = 0,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const renderStar = (index: number) => {
    const rating = index + 1;
    const isFilled = rating <= value;
    const isHalfFilled = !isFilled && rating - 0.5 <= value;

    return (
      <button
        key={index}
        type="button"
        onClick={() => handleClick(rating)}
        disabled={readonly}
        className={`${
          readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
        } transition-transform focus:outline-none`}
      >
        <Star
          className={`${sizeClasses[size]} ${
            isFilled
              ? 'fill-amber-400 text-amber-400'
              : isHalfFilled
              ? 'fill-amber-400/50 text-amber-400'
              : 'text-gray-300'
          }`}
        />
      </button>
    );
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">
        {Array.from({ length: max }).map((_, index) => renderStar(index))}
      </div>
      {showValue && (
        <span className={`${textSizeClasses[size]} font-medium text-gray-700 ml-1`}>
          {value.toFixed(1)}
        </span>
      )}
      {showCount && (
        <span className={`${textSizeClasses[size]} text-gray-500 ml-1`}>
          ({count})
        </span>
      )}
    </div>
  );
};

export interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const RatingInput: React.FC<RatingInputProps> = ({
  value,
  onChange,
  max = 5,
  size = 'lg',
  label,
  className = '',
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <Rating value={value} max={max} size={size} onChange={onChange} />
    </div>
  );
};

export default Rating;
