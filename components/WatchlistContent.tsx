"use client";

import React, { useState } from "react";
import WatchlistTable from "@/components/WatchlistTable";
import WatchlistNews from "@/components/WatchlistNews";
import SearchCommand from "@/components/SearchCommand";
import { Bookmark } from "lucide-react";

interface Props {
  initialWatchlist: StockWithData[];
  initialStocks: StockWithWatchlistStatus[];
  news: MarketNewsArticle[];
}

export default function WatchlistContent({
  initialWatchlist,
  initialStocks,
  news,
}: Props) {
  const [items, setItems] = useState<StockWithData[]>(initialWatchlist);

  const handleRemoveItem = (symbol: string) => {
    setItems((prev) => prev.filter((item) => item.symbol !== symbol));
  };

  if (items.length === 0) {
    return (
      <div className="watchlist-empty-container rounded-2xl border border-gray-800 bg-gray-800/20 py-16 px-6">
        <div className="watchlist-empty max-w-md mx-auto">
          <div className="h-20 w-20 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6">
            <Bookmark className="h-10 w-10 text-yellow-500 fill-yellow-500/20" />
          </div>
          <h2 className="empty-title text-2xl font-bold text-gray-100">
            Your watchlist is empty
          </h2>
          <p className="empty-description text-gray-400 mt-2 mb-8 text-base leading-relaxed">
            Track companies you care about. Search for stocks and add them to your watchlist to monitor real-time prices, metrics, and targeted market news.
          </p>
          <SearchCommand
            renderAs="button"
            label="Discover Stocks"
            initialStocks={initialStocks}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <WatchlistTable watchlist={items} onRemoveItem={handleRemoveItem} />
      <WatchlistNews news={news} />
    </div>
  );
}
