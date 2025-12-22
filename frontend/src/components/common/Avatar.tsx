import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils/formatters';
import { getImageUrl } from '@/utils/images';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className }) => {
  const imageUrl = src ? getImageUrl(src) : null;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || 'User avatar'}
        className={cn(
          'rounded-full object-cover bg-gray-100',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (name) {
    return (
      <div
        className={cn(
          'rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center',
          sizeClasses[size],
          className
        )}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gray-100 flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      <User className="w-1/2 h-1/2 text-gray-400" />
    </div>
  );
};

export default Avatar;

// Avatar with online indicator
interface AvatarWithStatusProps extends AvatarProps {
  isOnline?: boolean;
}

export const AvatarWithStatus: React.FC<AvatarWithStatusProps> = ({
  isOnline,
  ...props
}) => {
  return (
    <div className="relative inline-block">
      <Avatar {...props} />
      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
            isOnline ? 'bg-green-500' : 'bg-gray-300'
          )}
        />
      )}
    </div>
  );
};
