'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { fetchJSON } from '@/lib/actions/finnhub.actions';
import { formatPrice, formatChangePercent, formatMarketCapValue } from '@/lib/utils';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

function sanitizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 10);
}

function sanitizeCompanyName(company?: string, fallbackSymbol?: string): string {
  const sanitized = (company || fallbackSymbol || '').trim().slice(0, 100);
  return sanitized || 'Stock';
}

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

export async function addToWatchlist(symbol: string, company?: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const cleanSymbol = sanitizeSymbol(symbol);
  if (!cleanSymbol) {
    return { success: false, error: 'Invalid stock symbol' };
  }

  const cleanCompany = sanitizeCompanyName(company, cleanSymbol);

  try {
    await connectToDatabase();

    await Watchlist.findOneAndUpdate(
      { userId: user.id, symbol: cleanSymbol },
      {
        $setOnInsert: {
          userId: user.id,
          symbol: cleanSymbol,
          company: cleanCompany,
          addedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    revalidatePath('/watchlist');
    revalidatePath(`/stocks/${cleanSymbol}`);

    return { success: true };
  } catch (error) {
    console.error('addToWatchlist failed:', error);
    return { success: false, error: 'Failed to add stock to watchlist' };
  }
}

export async function removeFromWatchlist(symbol: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const cleanSymbol = sanitizeSymbol(symbol);
  if (!cleanSymbol) {
    return { success: false, error: 'Invalid stock symbol' };
  }

  try {
    await connectToDatabase();

    await Watchlist.deleteOne({ userId: user.id, symbol: cleanSymbol });

    revalidatePath('/watchlist');
    revalidatePath(`/stocks/${cleanSymbol}`);

    return { success: true };
  } catch (error) {
    console.error('removeFromWatchlist failed:', error);
    return { success: false, error: 'Failed to remove stock from watchlist' };
  }
}

export async function isStockInWatchlist(symbol: string): Promise<boolean> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return false;
  }

  const cleanSymbol = sanitizeSymbol(symbol);
  if (!cleanSymbol) {
    return false;
  }

  try {
    await connectToDatabase();
    const existing = await Watchlist.exists({ userId: user.id, symbol: cleanSymbol });
    return Boolean(existing);
  } catch (error) {
    console.error('isStockInWatchlist failed:', error);
    return false;
  }
}

export async function getUserWatchlist(): Promise<StockWithData[]> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return [];
  }

  try {
    await connectToDatabase();
    const rawItems = await Watchlist.find({ userId: user.id })
      .sort({ addedAt: -1 })
      .lean();

    if (!rawItems.length) {
      return [];
    }

    const token = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';

    const enriched = await Promise.all(
      rawItems.map(async (item) => {
        const symbol = String(item.symbol).toUpperCase();
        const baseItem: StockWithData = {
          userId: user.id,
          symbol,
          company: item.company || symbol,
          addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
        };

        if (!token) {
          return baseItem;
        }

        const quoteUrl = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
        const profileUrl = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
        const metricUrl = `${FINNHUB_BASE_URL}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${token}`;

        const [quoteRes, profileRes, metricRes] = await Promise.allSettled([
          fetchJSON<QuoteData>(quoteUrl, 60),
          fetchJSON<ProfileData>(profileUrl, 3600),
          fetchJSON<FinancialsData>(metricUrl, 3600),
        ]);

        const quote = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
        const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
        const metric = metricRes.status === 'fulfilled' ? metricRes.value : null;

        const currentPrice = typeof quote?.c === 'number' ? quote.c : undefined;
        const changePercent = typeof quote?.dp === 'number' ? quote.dp : undefined;

        const peValue =
          metric?.metric?.peNormalizedAnnual ??
          metric?.metric?.peTTM ??
          null;

        const companyName = profile?.name || baseItem.company;

        return {
          ...baseItem,
          company: companyName,
          currentPrice,
          changePercent,
          priceFormatted: typeof currentPrice === 'number' ? formatPrice(currentPrice) : 'N/A',
          changeFormatted: typeof changePercent === 'number' ? formatChangePercent(changePercent) : 'N/A',
          marketCap: profile?.marketCapitalization
            ? formatMarketCapValue(profile.marketCapitalization * 1e6)
            : 'N/A',
          peRatio: peValue !== null && typeof peValue === 'number' ? peValue.toFixed(2) : 'N/A',
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error('getUserWatchlist failed:', error);
    return [];
  }
}

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });
    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error:', err);
    return [];
  }
}
