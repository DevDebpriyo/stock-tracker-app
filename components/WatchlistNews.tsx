import React from "react";
import { formatTimeAgo } from "@/lib/utils";
import { ExternalLink, Newspaper } from "lucide-react";

interface Props {
  news?: MarketNewsArticle[];
}

export default function WatchlistNews({ news = [] }: Props) {
  if (!news.length) {
    return null;
  }

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center gap-2.5 text-xl font-bold text-gray-100">
        <Newspaper className="h-5 w-5 text-yellow-500" />
        <h2>Watchlist Market News</h2>
      </div>

      <div className="watchlist-news">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-item flex flex-col justify-between group transition-all duration-200 hover:border-yellow-500/50 hover:shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="news-tag">{item.related || item.category || "MARKET"}</span>
                <span className="text-xs text-gray-500">{formatTimeAgo(item.datetime)}</span>
              </div>
              <h3 className="news-title group-hover:text-yellow-400 transition-colors">
                {item.headline}
              </h3>
              <p className="news-summary">{item.summary}</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-700/60 mt-auto">
              <span className="text-xs text-gray-400 font-medium">{item.source}</span>
              <span className="news-cta flex items-center gap-1 font-medium">
                Read story <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
