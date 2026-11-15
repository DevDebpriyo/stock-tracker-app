import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { getNews, searchStocks } from "@/lib/actions/finnhub.actions";
import WatchlistContent from "@/components/WatchlistContent";
import SearchCommand from "@/components/SearchCommand";
import { formatDateToday } from "@/lib/utils";
import { Bookmark } from "lucide-react";

export const metadata = {
  title: "Watchlist | TraderX",
  description: "Monitor real-time prices, key financial ratios, and targeted market news for your watchlisted stocks.",
};

export default async function WatchlistPage() {
  const initialStocksPromise = searchStocks();
  const watchlistPromise = getUserWatchlist();

  const [initialStocks, watchlist] = await Promise.all([
    initialStocksPromise,
    watchlistPromise,
  ]);

  const symbols = watchlist.map((item) => item.symbol);
  const news = symbols.length > 0 ? await getNews(symbols) : [];

  return (
    <div className="min-h-screen py-4 md:py-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Bookmark className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
                Watchlist
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {formatDateToday}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SearchCommand
            renderAs="button"
            label="Add stock"
            initialStocks={initialStocks}
          />
        </div>
      </div>

      <WatchlistContent
        initialWatchlist={watchlist}
        initialStocks={initialStocks}
        news={news}
      />
    </div>
  );
}
