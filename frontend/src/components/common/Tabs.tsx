import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'pills' | 'underline' | 'boxed';
  fullWidth?: boolean;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  variant = 'underline',
  fullWidth = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const baseStyles = 'flex items-center gap-2 font-medium transition-colors';

  const variantStyles = {
    pills: {
      container: 'flex gap-2 p-1 bg-gray-100 rounded-lg',
      tab: (isActive: boolean) =>
        `${baseStyles} px-4 py-2 rounded-md text-sm ${
          isActive
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`,
    },
    underline: {
      container: 'flex border-b border-gray-200',
      tab: (isActive: boolean) =>
        `${baseStyles} px-4 py-3 text-sm border-b-2 -mb-px ${
          isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`,
    },
    boxed: {
      container: 'flex border border-gray-200 rounded-lg overflow-hidden',
      tab: (isActive: boolean) =>
        `${baseStyles} px-4 py-2 text-sm border-r last:border-r-0 border-gray-200 ${
          isActive
            ? 'bg-primary text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`,
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`${styles.container} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={`${styles.tab(activeTab === tab.id)} ${fullWidth ? 'flex-1 justify-center' : ''}`}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span
              className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.id
                  ? variant === 'boxed'
                    ? 'bg-white/20'
                    : 'bg-primary/10'
                  : 'bg-gray-200'
              }`}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export interface TabPanelProps {
  children: React.ReactNode;
  tabId: string;
  activeTab: string;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  tabId,
  activeTab,
  className = '',
}) => {
  if (tabId !== activeTab) return null;

  return <div className={className}>{children}</div>;
};

export default Tabs;
