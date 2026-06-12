import { ImageResponse } from 'next/og';
import { getTrack } from '@/lib/dataStore';

export const alt = 'ChartRider Ticker Preview';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Next.js 15 dynamic route parameter is a Promise
interface ImageParams {
  params: Promise<{ ticker: string }>;
}

export default async function Image({ params }: ImageParams) {
  const { ticker } = await params;
  const track = getTrack(ticker);

  const brandAccent = '#3DFFA0'; // Mint green default
  const redColor = '#FF4D4D';

  if (!track) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: 'white',
            fontFamily: 'sans-serif',
            border: '8px solid #262626',
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 900, marginBottom: 20 }}>🏍️ CHARTRIDER</div>
          <div style={{ fontSize: 32, color: '#888888' }}>Track Not Found</div>
        </div>
      ),
      { ...size }
    );
  }

  const { name, changePercent, difficulty, volatility, prices, assetType } = track;
  const isPositive = changePercent >= 0;
  
  // Calculate SVG path points for the chart preview (using last 60 points for dynamic clarity)
  const slicedPrices = prices.slice(-60);
  const min = Math.min(...slicedPrices);
  const max = Math.max(...slicedPrices);
  const range = max - min || 1;
  
  const svgW = 1000;
  const svgH = 300;
  const padding = 10;

  const points = slicedPrices.map((price, idx) => {
    const x = padding + (idx / (slicedPrices.length - 1)) * (svgW - padding * 2);
    const y = svgH - padding - ((price - min) / range) * (svgH - padding * 2);
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  // Difficulty badge colors
  let badgeColor = brandAccent;
  if (difficulty === 'Medium') badgeColor = '#F5A623';
  if (difficulty === 'Hard') badgeColor = '#FF6B35';
  if (difficulty === 'Insane') badgeColor = redColor;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0a0a',
          padding: '60px',
          fontFamily: 'sans-serif',
          color: 'white',
          border: '12px solid #141414',
        }}
      >
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: brandAccent, letterSpacing: 2, marginRight: 15 }}>
                CHARTRIDER
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  textTransform: 'uppercase',
                  color: '#888888',
                }}
              >
                {assetType}
              </span>
            </div>
            <span style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1 }}>
              {ticker} <span style={{ fontSize: 32, fontWeight: 500, color: '#888888', marginLeft: 10 }}>{name}</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: badgeColor,
                padding: '4px 14px',
                borderRadius: 20,
                border: `1px solid ${badgeColor}40`,
                backgroundColor: `${badgeColor}10`,
                marginBottom: 8,
              }}
            >
              {difficulty} (Vol: {volatility}%)
            </span>
            <span style={{ fontSize: 38, fontWeight: 800, color: isPositive ? brandAccent : redColor }}>
              {isPositive ? '+' : ''}
              {changePercent}%
            </span>
          </div>
        </div>

        {/* SVG Sparkline Preview */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '320px',
            backgroundColor: 'rgba(20, 20, 20, 0.4)',
            border: '2px solid #262626',
            borderRadius: 16,
            padding: '10px 0',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ overflow: 'visible' }}
          >
            <path
              d={pathData}
              fill="none"
              stroke={isPositive ? brandAccent : redColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ position: 'absolute', bottom: 15, left: 20, fontSize: 14, color: '#555555' }}>
            START TRACK
          </div>
          <div style={{ position: 'absolute', bottom: 15, right: 20, fontSize: 14, color: '#555555' }}>
            FINISH LINE
          </div>
        </div>

        {/* Bottom Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', color: '#666666', fontSize: 16 }}>
          <span>🏍️ Ride the charts of your favorite stocks and cryptos</span>
          <span>chartrider.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
