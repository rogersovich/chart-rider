import fs from 'fs';
import path from 'path';
import { Track } from '@/data/mockTracks';
import { mockTracks, mockLegendaryCrashes } from '@/data/mockTracks';

let cachedTracks: Record<string, Track> | null = null;
let cachedLegendary: Record<string, Track> | null = null;

// Initialize data maps
export function loadData() {
  try {
    const tracksPath = path.join(process.cwd(), 'src/data/tracks.json');
    const legendaryPath = path.join(process.cwd(), 'src/data/legendary.json');

    // Load trending/active tracks
    if (fs.existsSync(tracksPath)) {
      const data = fs.readFileSync(tracksPath, 'utf8');
      cachedTracks = JSON.parse(data);
    } else {
      console.warn('⚠️ tracks.json not found. Falling back to default mock data.');
      // Convert array mockTracks to dictionary
      const mockDict: Record<string, Track> = {};
      mockTracks.forEach((t) => {
        mockDict[t.ticker.toUpperCase()] = t;
      });
      cachedTracks = mockDict;
    }

    // Load legendary crash tracks
    if (fs.existsSync(legendaryPath)) {
      const data = fs.readFileSync(legendaryPath, 'utf8');
      cachedLegendary = JSON.parse(data);
    } else {
      console.warn('⚠️ legendary.json not found. Falling back to default mock data.');
      // Convert array mockLegendaryCrashes to dictionary
      const mockDict: Record<string, Track> = {};
      mockLegendaryCrashes.forEach((t) => {
        mockDict[t.ticker.toUpperCase()] = t;
      });
      cachedLegendary = mockDict;
    }
  } catch (error) {
    console.error('❌ Failed to load tracks data store:', error);
    cachedTracks = {};
    cachedLegendary = {};
  }
}

export function getTrack(ticker: string): Track | null {
  if (!cachedTracks || !cachedLegendary) {
    loadData();
  }
  
  const upperTicker = ticker.toUpperCase();
  if (cachedTracks && cachedTracks[upperTicker]) {
    return cachedTracks[upperTicker];
  }
  if (cachedLegendary && cachedLegendary[upperTicker]) {
    return cachedLegendary[upperTicker];
  }
  return null;
}

export function getAllTracks(): Track[] {
  if (!cachedTracks) {
    loadData();
  }
  return Object.values(cachedTracks || {});
}

export function getAllLegendary(): Track[] {
  if (!cachedLegendary) {
    loadData();
  }
  return Object.values(cachedLegendary || {});
}

export function reloadCache() {
  console.log('🔄 Reloading dataStore cache from disk...');
  loadData();
}
