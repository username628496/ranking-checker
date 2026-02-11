import React from 'react';
import { Search, List, Settings, History } from 'lucide-react';

interface TabNavigationProps {
 activeTab: string;
 onTabChange: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
 const tabs = [
 { id: 'single', label: 'Single Keyword Check', icon: Search },
 { id: 'bulk', label: 'Bulk Keyword Check (Top 30)', icon: List },
 { id: 'settings', label: 'API Settings', icon: Settings },
 { id: 'history', label: 'History / Logs', icon: History },
 ];

 return (
 <div className="w-full border-b border-base-300 bg-base-100">
 <div className="max-w-7xl mx-auto px-4">
 <div className="flex space-x-1 overflow-x-auto">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => onTabChange(tab.id)}
 className={`
 flex items-center gap-2 px-6 py-4 text-sm font-medium
 border-b-2 transition-all duration-200 whitespace-nowrap
 ${isActive
 ? 'border-primary text-primary'
 : 'border-transparent text-base-content/70 '
 }
 `}
 >
 <Icon size={18} />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>
 </div>
 </div>
 );
};

export default TabNavigation;
