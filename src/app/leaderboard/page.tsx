import type { Metadata } from 'next';
import LeaderboardView from '@/components/LeaderboardView';

interface Props {
  searchParams: Promise<{ ticker?: string; period?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { ticker = 'TSLA', period = '1Y' } = await searchParams;
  return {
    title: `Leaderboard — $${ticker} ${period} | ChartRider`,
    description: `Top ChartRider scores for $${ticker} over ${period}. Can you beat them?`,
  };
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const { ticker = 'TSLA', period = '1Y' } = await searchParams;

  return (
    <main>
      <LeaderboardView initialTicker={ticker} initialPeriod={period} />
    </main>
  );
}
