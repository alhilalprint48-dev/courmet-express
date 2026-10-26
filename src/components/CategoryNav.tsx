'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Beef, 
  Pizza, 
  UtensilsCrossed, 
  CupSoda, 
  Cake, 
  LayoutGrid,
  Salad,
  Sandwich,
  Flame,
  Coffee,
  Fish,
  Soup,
  Sparkles
} from 'lucide-react';

interface CategoryNavProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  const { language, t, categories } = useApp();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Beef': return <Beef className="w-4 h-4" />;
      case 'Pizza': return <Pizza className="w-4 h-4" />;
      case 'UtensilsCrossed': return <UtensilsCrossed className="w-4 h-4" />;
      case 'CupSoda': return <CupSoda className="w-4 h-4" />;
      case 'Cake': return <Cake className="w-4 h-4" />;
      case 'Salad': return <Salad className="w-4 h-4" />;
      case 'Sandwich': return <Sandwich className="w-4 h-4" />;
      case 'Flame': return <Flame className="w-4 h-4" />;
      case 'Coffee': return <Coffee className="w-4 h-4" />;
      case 'Fish': return <Fish className="w-4 h-4" />;
      case 'Soup': return <Soup className="w-4 h-4" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4" />;
      default: return <UtensilsCrossed className="w-4 h-4" />;
    }
  };

  return (
    <div className="sticky top-[88px] sm:top-[115px] z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 py-2 sm:py-2.5 px-3 sm:px-4 shadow-xs w-full max-w-full overflow-hidden">
      <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full">
        {/* All Items Pill */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeCategory === 'all'
              ? 'bg-dark-900 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>{t.categories.all}</span>
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getIcon(cat.iconName)}
              <span>{cat.name[language]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
