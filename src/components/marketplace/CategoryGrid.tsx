import {
  Camera,
  Cpu,
  Gamepad2,
  Headphones,
  Laptop,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import { AUCTION_CATEGORIES } from '@/lib/marketplace/types';

const CATEGORY_ICONS = {
  Electronics: Cpu,
  Laptops: Laptop,
  Smartphones: Smartphone,
  Audio: Headphones,
  Gaming: Gamepad2,
  Cameras: Camera,
} as const;

interface CategoryGridProps {
  countsByCategory?: Record<string, number>;
  onSelectCategory?: (categoryId: string) => void;
}

export const CategoryGrid = memo(function CategoryGrid({
  countsByCategory = {},
  onSelectCategory,
}: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {AUCTION_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.id];
        const count = countsByCategory[category.id] ?? 0;

        const cardBody = (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.06] text-[#e2e4e8] transition group-hover:border-white/35 group-hover:bg-white/15">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white/65">
                {count}
              </span>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-semibold text-white">{category.label}</h3>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-white/55">
                {category.subtitle}
              </p>
            </div>
          </>
        );

        if (onSelectCategory) {
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className="group flex cursor-pointer flex-col justify-between rounded-[24px] border border-white/15 bg-[#0e1015]/85 p-4 text-left transition-[border-color,background-color] hover:border-white/35 hover:bg-[#14171f] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {cardBody}
            </button>
          );
        }

        return (
          <Link
            key={category.id}
            href={`/search?category=${encodeURIComponent(category.id)}`}
            prefetch
            className="group flex flex-col justify-between rounded-[24px] border border-white/15 bg-[#0e1015]/85 p-4 transition-[border-color,background-color] hover:border-white/35 hover:bg-[#14171f] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {cardBody}
          </Link>
        );
      })}
    </div>
  );
});
