import React from "react";
import { Bookmark, Loader2 } from "lucide-react";

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
}

export default function PageLoader({
  title = "Loading Watchlist",
  subtitle = "Fetching live market data and watchlist items...",
}: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-700/80 bg-gray-900/95 p-8 shadow-2xl max-w-sm w-full mx-4 text-center">
        <div className="relative flex items-center justify-center h-14 w-14 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <Bookmark className="h-6 w-6 text-yellow-500 animate-pulse" />
          <Loader2 className="absolute inset-0 h-14 w-14 text-yellow-500 animate-spin opacity-40" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
