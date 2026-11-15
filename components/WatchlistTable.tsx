"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Loader2, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { getChangeColorClass } from "@/lib/utils";

interface Props {
  watchlist: StockWithData[];
  onRemoveItem?: (symbol: string) => void;
}

export default function WatchlistTable({ watchlist, onRemoveItem }: Props) {
  const router = useRouter();
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRemove = (symbol: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (removingSymbol || isPending) return;

    setRemovingSymbol(symbol);

    startTransition(async () => {
      try {
        const result = await removeFromWatchlist(symbol);
        if (!result?.success) {
          toast.error(result?.error || "Failed to remove stock");
          setRemovingSymbol(null);
          return;
        }

        onRemoveItem?.(symbol);
        toast.success(`Removed ${symbol} from watchlist`);
      } catch {
        toast.error("Failed to remove stock");
      } finally {
        setRemovingSymbol(null);
      }
    });
  };

  return (
    <div className="watchlist-table overflow-x-auto shadow-2xl">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="table-header-row">
            <th className="table-header py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-400">Company</th>
            <th className="table-header py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-400">Symbol</th>
            <th className="table-header py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-400">Price</th>
            <th className="table-header py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-400">24h Change</th>
            <th className="table-header py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-400">Market Cap</th>
            <th className="table-header py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-400">P/E Ratio</th>
            <th className="table-header py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/60 bg-gray-800/40">
          {watchlist.map((stock) => {
            const isPositive = (stock.changePercent ?? 0) >= 0;
            const isDeleting = removingSymbol === stock.symbol;

            return (
              <tr
                key={stock.symbol}
                onClick={() => router.push(`/stocks/${stock.symbol}`)}
                className="table-row group transition-colors duration-150 hover:bg-gray-700/40 cursor-pointer"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gray-700/60 border border-gray-600/50 flex items-center justify-center font-bold text-xs text-yellow-500 shrink-0">
                      {stock.symbol.slice(0, 4)}
                    </div>
                    <div className="min-w-0 max-w-[200px] sm:max-w-[280px]">
                      <div className="font-semibold text-gray-100 group-hover:text-yellow-400 transition-colors truncate">
                        {stock.company}
                      </div>
                      <div className="text-xs text-gray-500 sm:hidden">
                        {stock.symbol}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-gray-700/60 text-gray-300 border border-gray-600/40">
                    {stock.symbol}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className="font-semibold text-gray-100 font-mono">
                    {stock.priceFormatted ?? "N/A"}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className={`inline-flex items-center gap-1 font-mono font-medium text-sm ${getChangeColorClass(stock.changePercent)}`}>
                    {stock.changePercent !== undefined ? (
                      isPositive ? (
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                      )
                    ) : null}
                    <span>{stock.changeFormatted ?? "N/A"}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-gray-300 text-sm font-mono">
                    {stock.marketCap ?? "N/A"}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-gray-300 text-sm font-mono">
                    {stock.peRatio ?? "N/A"}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isDeleting || isPending}
                      onClick={(e) => handleRemove(stock.symbol, e)}
                      title={`Remove ${stock.symbol} from watchlist`}
                      aria-label={`Remove ${stock.symbol} from watchlist`}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                    <Link
                      href={`/stocks/${stock.symbol}`}
                      onClick={(e) => e.stopPropagation()}
                      title={`View ${stock.symbol} details`}
                      className="p-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 border border-transparent hover:border-yellow-500/20 transition-all duration-150"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
