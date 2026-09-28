// The carrier's line (pure geometry, shared by the renderer in carrier.ts and the unit tests).

/** A carrier through points (x, y) with a shallow catenary between each pair (spans sag by ≈5% of their length).
 *  `taut`: the carrier bears a hanging tender at these points, so each span stays straight enough never to dip below
 *  its lower end (a span's sag is at most its rise / π). Weapon clearance relies on this (see draw-ship
 *  `carrierFloor`). */
export function carrierThrough(pts: [number, number][], taut = false): (x: number) => number {
  const sorted = [...pts].sort((a, b) => a[0] - b[0]);
  return (x: number) => {
    for (let k = 0; k < sorted.length - 1; k++) {
      const [ax, ay] = sorted[k];
      const [bx, by] = sorted[k + 1];
      if (x < ax || x > bx) continue;
      const f = (x - ax) / Math.max(1, bx - ax);
      const sag = taut ? Math.min(6, Math.abs(bx - ax) * 0.05, (Math.abs(by - ay) / Math.PI) * 0.9) : Math.min(18, Math.abs(bx - ax) * 0.05);
      return ay + (by - ay) * f + Math.sin(f * Math.PI) * sag;
    }
    return x < sorted[0][0] ? sorted[0][1] : sorted[sorted.length - 1][1];
  };
}

/** A parabolic span from (x0, y0) to (x1, y1) sagging by `sag` at its middle. */
export function carrierSag(x0: number, y0: number, x1: number, y1: number, sag: number): (x: number) => number {
  return (x: number) => {
    const u = (x - x0) / Math.max(1, x1 - x0);
    return y0 + (y1 - y0) * u + sag * 4 * u * (1 - u);
  };
}
