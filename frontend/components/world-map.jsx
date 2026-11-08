'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import { integer } from '../lib/format';

const WIDTH = 960;
const HEIGHT = 480;

// Built once at module load — the projection and land geometry never change.
const projection = geoNaturalEarth1().fitExtent([[8, 8], [WIDTH - 8, HEIGHT - 8]], { type: 'Sphere' });
const pathGen = geoPath(projection);
const LAND = pathGen(feature(world, world.objects.land));
const BORDERS = pathGen(feature(world, world.objects.countries));
const GRATICULE = pathGen(geoGraticule10());

function toneFor(region) {
  if (region.critical_count >= 30 || region.errors_1h >= 20) return { color: '#ff5a5f', label: 'Degraded' };
  if (region.error_count >= 60 || region.errors_1h >= 8) return { color: '#ff9140', label: 'Elevated' };
  return { color: '#c6f24e', label: 'Healthy' };
}

export function WorldMap({ regions = [], interactive = true, compact = false, className = '' }) {
  const router = useRouter();
  const [hover, setHover] = useState(null);

  const markers = useMemo(() => {
    const max = Math.max(1, ...regions.map((r) => r.error_count));
    return regions.map((region) => {
      const [x, y] = projection([region.lng, region.lat]) || [0, 0];
      return { ...region, x, y, radius: 5 + (region.error_count / max) * 9, tone: toneFor(region) };
    });
  }, [regions]);

  const active = markers.find((m) => m.region_name === hover);

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="World map of error activity by region">
        <path d={GRATICULE} className="map-graticule" />
        <path d={LAND} className="map-land" />
        <path d={BORDERS} fill="none" stroke="#0a0b0d" strokeWidth=".6" opacity=".7" />
        {markers.map((m) => (
          <g
            key={m.region_name}
            transform={`translate(${m.x} ${m.y})`}
            className={interactive ? 'cursor-pointer' : ''}
            onMouseEnter={() => setHover(m.region_name)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(m.region_name)}
            onBlur={() => setHover(null)}
            onClick={() => interactive && router.push(`/logs?region=${encodeURIComponent(m.region_name)}`)}
            tabIndex={interactive ? 0 : -1}
            role={interactive ? 'link' : undefined}
            aria-label={`${m.label}: ${m.error_count} errors in 24 hours`}
            onKeyDown={(e) => { if (interactive && e.key === 'Enter') router.push(`/logs?region=${encodeURIComponent(m.region_name)}`); }}
          >
            <circle r={m.radius} fill={m.tone.color} opacity=".25" className="origin-center animate-pulseRing" style={{ transformBox: 'fill-box' }} />
            <circle r={m.radius * 1.9} fill={m.tone.color} opacity=".07" />
            <circle r={Math.max(4, m.radius * .6)} fill={m.tone.color} stroke="#0a0b0d" strokeWidth="2" />
            {!compact && (
              <text x={m.radius + 8} y={4} fontSize="13" fontWeight="600" fill="#e8e9ec" stroke="#0a0b0d" strokeWidth="3" paintOrder="stroke">
                {m.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute z-10 w-52 -translate-x-1/2 rounded-lg border border-line/10 bg-raised/95 p-3 text-xs shadow-xl backdrop-blur"
          style={{
            left: `${Math.min(88, Math.max(12, (active.x / WIDTH) * 100))}%`,
            top: `${(active.y / HEIGHT) * 100 + 5}%`
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">{active.label} · {active.city}</span>
            <span className="flex items-center gap-1.5" style={{ color: active.tone.color }}>
              <span className="size-1.5 rounded-full bg-current" />{active.tone.label}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-soft">
            <dt>Errors · 24h</dt><dd className="num text-right text-ink">{integer(active.error_count)}</dd>
            <dt>Critical</dt><dd className="num text-right text-ink">{integer(active.critical_count)}</dd>
            <dt>Errors · last hour</dt><dd className="num text-right text-ink">{integer(active.errors_1h)}</dd>
            <dt>Events</dt><dd className="num text-right text-ink">{integer(active.events)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
