export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }
  if (returns.length === 0) return 0;
  
  // Mean return
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  // Variance
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  // Std Dev as percentage
  const stdDev = Math.sqrt(variance) * 100;
  return Number(stdDev.toFixed(2));
}

export function getDifficulty(volatility: number): 'Easy' | 'Medium' | 'Hard' | 'Insane' {
  if (volatility < 1.2) return 'Easy';
  if (volatility < 2.5) return 'Medium';
  if (volatility < 5.0) return 'Hard';
  return 'Insane';
}

export function smoothPrices(prices: number[], windowSize = 5): number[] {
  if (prices.length <= windowSize) return [...prices];
  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < prices.length; i++) {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(prices.length - 1, i + halfWindow);

    for (let j = start; j <= end; j++) {
      sum += prices[j];
      count++;
    }
    smoothed.push(Number((sum / count).toFixed(2)));
  }
  return smoothed;
}

export interface Coordinate {
  x: number;
  y: number;
}

export function getNormalizedCoordinates(
  prices: number[],
  width: number,
  height: number,
  paddingY = 20,
  paddingX = 10
): Coordinate[] {
  if (prices.length === 0) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  return prices.map((price, idx) => {
    const x = paddingX + (idx / (prices.length - 1)) * (width - paddingX * 2);
    // Invert Y axis for canvas/SVG coordinate space (0 is top)
    const y = height - paddingY - ((price - min) / range) * (height - paddingY * 2);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
}

/**
 * Simplifies a price series using the Ramer-Douglas-Peucker (RDP) algorithm,
 * then reconstructs a full-length array using linear interpolation.
 * This filters out all minor spikes and turns the chart into clean, predictable slopes and flats.
 *
 * @param prices The original price array
 * @param threshold Relative distance threshold (default is 4.5% of the total price range)
 */
export function simplifyPricesRDP(prices: number[], threshold = 0.045): number[] {
  if (prices.length <= 2) return [...prices];

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const maxIndex = prices.length - 1;

  // Convert 1D prices to normalized 2D Points [0, 1] for scale-independent RDP distance check
  const points = prices.map((y, x) => ({
    x: x / maxIndex,
    y: (y - minPrice) / priceRange,
    originalIndex: x
  }));

  // Line-point perpendicular distance helper
  const getDistance = (
    p: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (dx === 0 && dy === 0) {
      return Math.sqrt((p.x - p1.x) ** 2 + (p.y - p1.y) ** 2);
    }
    const t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    const projX = p1.x + clampedT * dx;
    const projY = p1.y + clampedT * dy;
    return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
  };

  // Recursive RDP implementation
  const rdpIter = (pts: typeof points): typeof points => {
    if (pts.length <= 2) return pts;

    let maxDist = 0;
    let index = 0;
    const last = pts.length - 1;

    for (let i = 1; i < last; i++) {
      const dist = getDistance(pts[i], pts[0], pts[last]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > threshold) {
      const firstHalf = rdpIter(pts.slice(0, index + 1));
      const secondHalf = rdpIter(pts.slice(index));
      return firstHalf.slice(0, firstHalf.length - 1).concat(secondHalf);
    }

    return [pts[0], pts[last]];
  };

  const keypoints = rdpIter(points);

  // Map keypoints back to original Y prices
  const mappedKeypoints = keypoints.map(kp => ({
    index: kp.originalIndex,
    value: prices[kp.originalIndex]
  }));

  // Reconstruct full-length array by interpolating between keypoints
  const simplified: number[] = new Array(prices.length);
  for (let k = 0; k < mappedKeypoints.length - 1; k++) {
    const kpStart = mappedKeypoints[k];
    const kpEnd = mappedKeypoints[k + 1];
    const idxStart = kpStart.index;
    const idxEnd = kpEnd.index;
    const valStart = kpStart.value;
    const valEnd = kpEnd.value;
    const stepCount = idxEnd - idxStart;

    for (let i = idxStart; i <= idxEnd; i++) {
      if (stepCount === 0) {
        simplified[i] = valStart;
      } else {
        const t = (i - idxStart) / stepCount;
        simplified[i] = Number((valStart + (valEnd - valStart) * t).toFixed(4));
      }
    }
  }

  // Smooth the simplified prices to round off the sharp corners for gameplay
  return smoothPrices(simplified, 9);
}
