import { useState } from "react";

interface RatingItem {
  rating: string;
  count: number;
  percentage: number;
  color: string;
}

interface StatusItem {
  status: string;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface CategoryItem {
  category: string;
  count: number;
}

// 1. Donut Chart: Alerts by Rating
export function DonutChart({
  data,
  total,
  onSelectRating,
  selectedRating,
}: {
  data: RatingItem[];
  total: number;
  onSelectRating?: (rating: string) => void;
  selectedRating?: string;
}) {
  const [hovered, setHovered] = useState<RatingItem | null>(null);

  const radius = 68;
  const strokeWidth = 32;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative offsets
  let cumulative = 0;
  const slices = data.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -cumulative * circumference;
    cumulative += item.percentage / 100;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex flex-col items-center justify-between h-full">
      {/* SVG Container */}
      <div className="relative my-auto flex items-center justify-center">
        <svg
          viewBox="0 0 200 200"
          className="h-44 w-44 -rotate-90 transform transition-transform duration-300"
        >
          {total === 0 ? (
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#E9ECF1"
              strokeWidth={strokeWidth}
            />
          ) : (
            slices.map((slice) => {
              const isSelected = selectedRating?.toLowerCase() === slice.rating.toLowerCase();
              const isHovered = hovered?.rating === slice.rating;
              return (
                <circle
                  key={slice.rating}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered || isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHovered(slice)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelectRating && onSelectRating(slice.rating)}
                />
              );
            })
          )}
        </svg>

        {/* Center Cutout Text */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {hovered ? (
            <>
              <span className="text-xl font-extrabold text-[#282B32] leading-none">
                {hovered.count}
              </span>
              <span className="text-[10px] font-semibold text-[#8A94A6] mt-0.5">
                {hovered.rating} ({hovered.percentage}%)
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-extrabold text-[#282B32] leading-none">
                {total}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A94A6] mt-0.5">
                Total
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bottom Legend */}
      <div className="mt-4 flex items-center justify-center gap-5 text-xs text-[#64748B]">
        {data.map((item) => (
          <button
            key={item.rating}
            type="button"
            onClick={() => onSelectRating && onSelectRating(item.rating)}
            onMouseEnter={() => setHovered(item)}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center gap-1.5 transition-opacity ${
              selectedRating && selectedRating.toLowerCase() !== item.rating.toLowerCase()
                ? "opacity-40"
                : "opacity-100 font-semibold"
            }`}
          >
            <span
              className="inline-block h-3 w-3 rounded-xs"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[#282B32]">{item.rating}</span>
            <span className="text-[#8A94A6] text-[11px]">({item.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 2. Horizontal Stacked Bar Chart: Status by Rating
export function StatusByRatingChart({
  data,
  onSelectStatus,
}: {
  data: StatusItem[];
  onSelectStatus?: (status: string) => void;
}) {
  const [hoveredRow, setHoveredRow] = useState<StatusItem | null>(null);

  // Maximum total for scaling the bar widths
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      {/* Bars Stack */}
      <div className="space-y-4 my-auto pt-1">
        {data.map((item) => {
          const rowScale = Math.max(item.total / maxTotal, 0.08);
          const barWidthPercent = item.total === 0 ? 6 : Math.max(rowScale * 100, 15);

          const highShare = item.total > 0 ? (item.high / item.total) * 100 : 0;
          const medShare = item.total > 0 ? (item.medium / item.total) * 100 : 0;
          const lowShare = item.total > 0 ? (item.low / item.total) * 100 : 0;

          return (
            <div
              key={item.status}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredRow(item)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => onSelectStatus && onSelectStatus(item.status)}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#282B32] group-hover:text-blue-600 transition truncate max-w-[150px]">
                  {item.status}
                </span>
                <span className="text-[11px] font-semibold text-[#8A94A6]">
                  {item.total}
                </span>
              </div>

              {/* Stacked Bar Container */}
              <div className="relative h-4 w-full rounded-sm bg-[#F0F2F5] overflow-hidden flex items-center">
                <div
                  className="h-full flex overflow-hidden rounded-sm transition-all duration-500"
                  style={{ width: `${barWidthPercent}%` }}
                >
                  {item.high > 0 && (
                    <div
                      style={{ width: `${highShare}%`, backgroundColor: "#E9786D" }}
                      className="h-full transition-all"
                      title={`High: ${item.high}`}
                    />
                  )}
                  {item.medium > 0 && (
                    <div
                      style={{ width: `${medShare}%`, backgroundColor: "#F9AD61" }}
                      className="h-full transition-all"
                      title={`Medium: ${item.medium}`}
                    />
                  )}
                  {item.low > 0 && (
                    <div
                      style={{ width: `${lowShare}%`, backgroundColor: "#80C271" }}
                      className="h-full transition-all"
                      title={`Low: ${item.low}`}
                    />
                  )}
                  {item.total === 0 && (
                    <div className="h-full w-full bg-[#E2E8F0]" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover Info Tooltip */}
      {hoveredRow && (
        <div className="rounded bg-slate-50 border border-slate-200 px-3 py-1.5 text-[11px] text-[#282B32] flex items-center justify-between">
          <span className="font-bold">{hoveredRow.status}:</span>
          <div className="flex items-center gap-3">
            <span className="text-[#E9786D] font-semibold">High: {hoveredRow.high}</span>
            <span className="text-[#F9AD61] font-semibold">Med: {hoveredRow.medium}</span>
            <span className="text-[#80C271] font-semibold">Low: {hoveredRow.low}</span>
          </div>
        </div>
      )}

      {/* Bottom Legend */}
      <div className="mt-4 flex items-center justify-center gap-5 text-xs text-[#64748B]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-xs bg-[#E9786D]" />
          <span className="text-[#282B32]">High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-xs bg-[#F9AD61]" />
          <span className="text-[#282B32]">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-xs bg-[#80C271]" />
          <span className="text-[#282B32]">Low</span>
        </div>
      </div>
    </div>
  );
}

// 3. Horizontal Bar Chart: Alerts by Regulation Category
export function CategoryBarChart({
  data,
  onSelectCategory,
  selectedCategory,
}: {
  data: CategoryItem[];
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="space-y-3.5 my-auto pt-1">
        {data.map((item) => {
          const barWidthPercent = Math.max((item.count / maxCount) * 100, 4);
          const isSelected = selectedCategory === item.category;

          return (
            <div
              key={item.category}
              className="group cursor-pointer"
              onClick={() => onSelectCategory && onSelectCategory(item.category)}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={`truncate max-w-[200px] sm:max-w-[240px] transition ${
                    isSelected
                      ? "text-[#2049D8] font-bold"
                      : "text-[#282B32] font-medium group-hover:text-blue-600"
                  }`}
                  title={item.category}
                >
                  {item.category}
                </span>
                <span className="text-[11px] font-semibold text-[#8A94A6]">
                  {item.count}
                </span>
              </div>

              {/* Coral Red Horizontal Bar */}
              <div className="relative h-4 w-full rounded-sm bg-[#F0F2F5] overflow-hidden">
                <div
                  className="h-full rounded-r-sm bg-[#E9786D] transition-all duration-500 group-hover:opacity-90"
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </div>
          );
        })}

        {data.length === 0 && (
          <p className="text-center text-xs text-[#8A94A6] py-8">
            No regulation categories recorded yet.
          </p>
        )}
      </div>

      <p className="text-[11px] text-[#8A94A6] text-right pt-2 border-t border-[#E9ECF1]">
        Sorted by total alerts descending
      </p>
    </div>
  );
}
