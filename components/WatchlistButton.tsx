"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { Loader2, Trash2 } from "lucide-react";

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(Boolean(isInWatchlist));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAdded(Boolean(isInWatchlist));
  }, [isInWatchlist]);

  const isRemoveAction = isPending ? !added : added;

  const label = useMemo(() => {
    if (type === "icon") return "";
    if (isPending) return added ? "Adding..." : "Removing...";
    return added ? "Remove from Watchlist" : "Add to Watchlist";
  }, [added, type, isPending]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending) return;

    const targetState = !added;
    setAdded(targetState);
    onWatchlistChange?.(symbol, targetState);

    startTransition(async () => {
      try {
        const actionResult = targetState
          ? await addToWatchlist(symbol, company)
          : await removeFromWatchlist(symbol);

        if (!actionResult?.success) {
          setAdded(!targetState);
          onWatchlistChange?.(symbol, !targetState);
          toast.error(actionResult?.error || "Failed to update watchlist");
          return;
        }

        toast.success(
          targetState
            ? `Added ${symbol} to your watchlist`
            : `Removed ${symbol} from your watchlist`
        );
      } catch {
        setAdded(!targetState);
        onWatchlistChange?.(symbol, !targetState);
        toast.error("An unexpected error occurred");
      }
    });
  };

  if (type === "icon") {
    return (
      <button
        type="button"
        disabled={isPending}
        title={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
        aria-label={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
        className={`watchlist-icon-btn ${added ? "watchlist-icon-added" : ""} disabled:opacity-50`}
        onClick={handleClick}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
        ) : showTrashIcon && added ? (
          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-400 transition-colors" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={added ? "#FACC15" : "none"}
            stroke="#FACC15"
            strokeWidth="1.5"
            className="w-5 h-5 transition-transform active:scale-90"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
            />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      className={`watchlist-btn flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 ${
        isRemoveAction ? "watchlist-remove" : ""
      }`}
      onClick={handleClick}
    >
      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : showTrashIcon && isRemoveAction ? (
        <Trash2 className="h-5 w-5" />
      ) : null}
      <span>{label}</span>
    </button>
  );
};

export default WatchlistButton;
