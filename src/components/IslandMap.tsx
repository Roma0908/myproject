import React from 'react';
import { TERRAIN_META } from '../data/terrain';
import {
  AStarResult,
  AStarStep,
  Coordinates,
  Resident,
  Tile,
} from '../types/simulation';

interface IslandMapProps {
  grid: Tile[][];
  residents: Resident[];
  selectedTile: Coordinates | null;
  selectedResidentId: string | null;
  onSelectTile: (coords: Coordinates) => void;
  onSelectResident: (residentId: string) => void;
  showAStarOverlay?: boolean;
  customAStar?: AStarResult | null;
  customAStarStep?: AStarStep | null;
  compact?: boolean;
}

const CELL = 32;

export const IslandMap: React.FC<IslandMapProps> = ({
  grid,
  residents,
  selectedTile,
  selectedResidentId,
  onSelectTile,
  onSelectResident,
  showAStarOverlay = true,
  customAStar = null,
  customAStarStep = null,
  compact = false,
}) => {
  const size = grid.length;
  const viewSize = size * CELL;

  const selectedResident = residents.find((r) => r.id === selectedResidentId) ?? null;
  const activeAStar = customAStar ?? selectedResident?.lastAStar ?? null;

  // Determine explored & frontier sets from either step-by-step inspection or full A* result
  const exploredKeys = new Set<string>();
  const frontierKeys = new Set<string>();
  const pathKeys = new Set<string>();

  if (showAStarOverlay && activeAStar) {
    if (customAStarStep) {
      for (const c of customAStarStep.closedSet) exploredKeys.add(`${c.x},${c.y}`);
      for (const f of customAStarStep.frontier) frontierKeys.add(`${f.x},${f.y}`);
    } else {
      for (const c of activeAStar.exploredNodes) exploredKeys.add(`${c.x},${c.y}`);
      for (const f of activeAStar.frontierNodes) frontierKeys.add(`${f.x},${f.y}`);
    }
    if (!customAStarStep && activeAStar.found) {
      for (const p of activeAStar.path) pathKeys.add(`${p.x},${p.y}`);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-xl border border-[#263B30] bg-[#0D1613]">
        <svg
          data-testid="island-map"
          viewBox={`0 0 ${viewSize} ${viewSize}`}
          className={`w-full h-auto block select-none ${
            compact ? 'max-h-[420px]' : 'max-h-[640px]'
          }`}
          role="img"
          aria-label={`Арал картасы ${size}x${size}`}
        >
          {/* Base Terrain Tiles */}
          {grid.map((row, y) =>
            row.map((tile, x) => {
              const meta = TERRAIN_META[tile.terrain];
              const px = x * CELL;
              const py = y * CELL;
              const key = `${x},${y}`;
              const isSelectedTile =
                selectedTile && selectedTile.x === x && selectedTile.y === y;
              const isExplored = exploredKeys.has(key);
              const isFrontier = frontierKeys.has(key);
              const isObstacleInOverlay =
                showAStarOverlay && activeAStar && !meta.walkable;

              return (
                <g
                  key={key}
                  onClick={() => onSelectTile({ x, y })}
                  className="cursor-pointer"
                >
                  <rect
                    x={px}
                    y={py}
                    width={CELL}
                    height={CELL}
                    fill={isObstacleInOverlay ? '#33393B' : meta.fill}
                    stroke={meta.stroke}
                    strokeWidth={0.6}
                  />

                  {/* Subtle environmental symbols per terrain */}
                  {tile.terrain === 'water' && (
                    <path
                      d={`M${px + 6} ${py + 14} Q${px + 11} ${py + 11} ${px + 16} ${py + 14} T${px + 26} ${py + 14}`}
                      fill="none"
                      stroke="#579BB8"
                      strokeWidth={1.1}
                      strokeOpacity={0.55}
                    />
                  )}

                  {tile.terrain === 'forest' && (
                    <g opacity={tile.resourceAmount > 0 ? 1 : 0.35}>
                      <polygon
                        points={`${px + 16},${py + 5} ${px + 8},${py + 21} ${px + 24},${py + 21}`}
                        fill="#2E573B"
                      />
                      <polygon
                        points={`${px + 16},${py + 9} ${px + 10},${py + 24} ${px + 22},${py + 24}`}
                        fill="#3F6A4C"
                      />
                      <rect
                        x={px + 14.5}
                        y={py + 24}
                        width={3}
                        height={4}
                        fill="#6B533B"
                      />
                    </g>
                  )}

                  {tile.terrain === 'berry' && (
                    <g opacity={tile.resourceAmount > 0 ? 1 : 0.35}>
                      <circle cx={px + 16} cy={py + 17} r={7.5} fill="#365B3A" />
                      <circle cx={px + 13} cy={py + 15} r={2.2} fill="#D76D61" />
                      <circle cx={px + 19} cy={py + 14} r={2} fill="#D76D61" />
                      <circle cx={px + 16} cy={py + 20} r={2.1} fill="#E7A34F" />
                    </g>
                  )}

                  {tile.terrain === 'rock' && (
                    <g>
                      <polygon
                        points={`${px + 7},${py + 24} ${px + 13},${py + 10} ${px + 21},${py + 12} ${px + 26},${py + 24}`}
                        fill="#505A5D"
                      />
                      <polygon
                        points={`${px + 13},${py + 10} ${px + 17},${py + 24} ${px + 26},${py + 24} ${px + 21},${py + 12}`}
                        fill="#6B767A"
                      />
                    </g>
                  )}

                  {tile.terrain === 'fertile' && (
                    <g stroke="#97B36E" strokeWidth={1} strokeOpacity={0.55}>
                      <line x1={px + 7} y1={py + 12} x2={px + 25} y2={py + 12} />
                      <line x1={px + 7} y1={py + 18} x2={px + 25} y2={py + 18} />
                      <line x1={px + 7} y1={py + 24} x2={px + 25} y2={py + 24} />
                    </g>
                  )}

                  {tile.terrain === 'mud' && (
                    <g fill="#5B4B37" opacity={0.7}>
                      <ellipse cx={px + 13} cy={py + 15} rx={5} ry={3} />
                      <ellipse cx={px + 21} cy={py + 22} rx={4} ry={2.5} />
                    </g>
                  )}

                  {tile.isCamp && (
                    <g>
                      <polygon
                        points={`${px + 16},${py + 5} ${px + 6},${py + 18} ${px + 26},${py + 18}`}
                        fill="#C8B995"
                      />
                      <rect
                        x={px + 9}
                        y={py + 18}
                        width={14}
                        height={9}
                        fill="#8A6E4B"
                      />
                      <circle cx={px + 16} cy={py + 23} r={3} fill="#E7A34F" />
                    </g>
                  )}

                  {/* A* Explored & Frontier Overlays */}
                  {isExplored && (
                    <rect
                      x={px + 2}
                      y={py + 2}
                      width={CELL - 4}
                      height={CELL - 4}
                      fill="#3B82F6"
                      fillOpacity={0.28}
                      rx={3}
                    />
                  )}

                  {isFrontier && (
                    <rect
                      x={px + 3}
                      y={py + 3}
                      width={CELL - 6}
                      height={CELL - 6}
                      fill="#E7A34F"
                      fillOpacity={0.42}
                      stroke="#E7A34F"
                      strokeWidth={1}
                      rx={3}
                    />
                  )}

                  {pathKeys.has(key) && (
                    <circle
                      cx={px + CELL / 2}
                      cy={py + CELL / 2}
                      r={3.5}
                      fill="#FFFFFF"
                      fillOpacity={0.9}
                    />
                  )}

                  {/* Fog tint on unexplored outer tiles */}
                  {!tile.explored && (
                    <rect
                      x={px}
                      y={py}
                      width={CELL}
                      height={CELL}
                      fill="#0B1310"
                      fillOpacity={0.28}
                    />
                  )}

                  {/* Selected tile outline */}
                  {isSelectedTile && (
                    <rect
                      x={px + 1}
                      y={py + 1}
                      width={CELL - 2}
                      height={CELL - 2}
                      fill="none"
                      stroke="#D5AE64"
                      strokeWidth={2.2}
                      rx={2}
                    />
                  )}
                </g>
              );
            })
          )}

          {/* A* Route Polyline + Start (Green) + Goal (Gold) */}
          {showAStarOverlay && activeAStar && (
            <g pointerEvents="none">
              {activeAStar.found && activeAStar.path.length > 1 && !customAStarStep && (
                <polyline
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={2.4}
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={activeAStar.path
                    .map((p) => `${p.x * CELL + CELL / 2},${p.y * CELL + CELL / 2}`)
                    .join(' ')}
                />
              )}

              {/* Start Node (Green) */}
              <rect
                x={activeAStar.start.x * CELL + 3}
                y={activeAStar.start.y * CELL + 3}
                width={CELL - 6}
                height={CELL - 6}
                fill="none"
                stroke="#4ADE80"
                strokeWidth={2.2}
                rx={4}
              />

              {/* Goal Node (Gold) */}
              <rect
                x={activeAStar.goal.x * CELL + 3}
                y={activeAStar.goal.y * CELL + 3}
                width={CELL - 6}
                height={CELL - 6}
                fill="none"
                stroke="#D5AE64"
                strokeWidth={2.4}
                rx={4}
              />

              {/* Current Step Node in Step-by-Step Mode */}
              {customAStarStep && (
                <rect
                  x={customAStarStep.current.x * CELL + 4}
                  y={customAStarStep.current.y * CELL + 4}
                  width={CELL - 8}
                  height={CELL - 8}
                  fill="#FFFFFF"
                  fillOpacity={0.45}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  rx={4}
                />
              )}
            </g>
          )}

          {/* Animated Residents Layer */}
          {residents.map((res) => {
            const isSelected = res.id === selectedResidentId;
            const alive = res.health > 0;
            const tx = res.x * CELL + CELL / 2;
            const ty = res.y * CELL + CELL / 2;

            return (
              <g
                key={res.id}
                style={{
                  transform: `translate(${tx}px, ${ty}px)`,
                  transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectResident(res.id);
                  onSelectTile({ x: res.x, y: res.y });
                }}
                className="cursor-pointer"
              >
                {isSelected && (
                  <circle
                    cx={0}
                    cy={0}
                    r={13}
                    fill="none"
                    stroke="#D5AE64"
                    strokeWidth={2}
                  />
                )}
                <circle
                  cx={0}
                  cy={0}
                  r={9.5}
                  fill={alive ? res.color : '#555B58'}
                  stroke="#101B17"
                  strokeWidth={2}
                />
                <text
                  x={0}
                  y={3.5}
                  textAnchor="middle"
                  className="fill-[#101B17] text-[10px] font-bold font-mono pointer-events-none"
                >
                  {res.name.charAt(0)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Terrain & A* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#C8B995]">
        {(
          ['grassland', 'forest', 'water', 'berry', 'rock', 'fertile', 'mud', 'path'] as const
        ).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-[#263B30]"
              style={{ backgroundColor: TERRAIN_META[t].fill }}
            />
            <span>{TERRAIN_META[t].labelKz}</span>
          </span>
        ))}
        {showAStarOverlay && (
          <>
            <span className="text-[#263B30]">|</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border-2 border-[#4ADE80]" />
              <span>Бастау (A*)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border-2 border-[#D5AE64]" />
              <span>Мақсат</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#3B82F6]/60" />
              <span>Зерттелген</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#E7A34F]/70" />
              <span>Шекара</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-white" />
              <span>A* бағыты</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
