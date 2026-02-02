'use client';

// CategoryFilter Component
interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const categories = [
    { value: 'all', label: 'All Categories', icon: '🏷️' },
    { value: 'art', label: 'Art & Collectibles', icon: '🎨' },
    { value: 'gaming', label: 'Gaming', icon: '🎮' },
    { value: 'music', label: 'Music & Media', icon: '🎵' },
    { value: 'fashion', label: 'Fashion & Wearables', icon: '👕' },
    { value: 'tech', label: 'Technology', icon: '💻' },
    { value: 'real-estate', label: 'Real Estate', icon: '🏠' },
    { value: 'other', label: 'Other', icon: '📦' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      {categories.map((category) => (
        <button
          key={category.value}
          onClick={() => onChange(category.value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            value === category.value
              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              : 'bg-background-tertiary text-text-secondary hover:text-text-primary hover:bg-background-elevated border border-transparent'
          }`}
        >
          <span>{category.icon}</span>
          <span className="text-sm font-medium">{category.label}</span>
        </button>
      ))}
    </div>
  );
}