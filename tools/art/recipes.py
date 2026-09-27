"""Pixelize parameter recipes per asset group (the defaults every final starts from; per-final overrides are
recorded in art-src/manifest.json)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INIT = ROOT / "art-src" / "init"

SPACE_BG = "#0c0f1c"

# DIRECTION v3 (HD hi-bit): sources are ~2x the final HD size; palettes are the master ramps plus 2 in-between
# steps per neighbouring pair (130 candidates), capped at 64 colours per asset (+ recorded k-means extras for scenes).
HI = dict(ramp_steps=2, max_colors=64)
BASE = {
    # hull sprites: exact silhouette alpha (covers the room grid), selective dark outline
    "ship": dict(down="median", trim=0.0, pre_median=3, alpha="sil", outline="sel", bg=SPACE_BG, bg_tol=0.045,
                 edge_band=24, min_share=0.0008, orphan_dl=0.16, orphan_passes=2, **HI),
    # full-screen backgrounds, key art, endings (1920x1080)
    "scene": dict(down="median", trim=0.0, alpha="none", extra=16, extra_thresh=0.03, min_share=0.0004,
                  orphan_dl=0.12, orphan_passes=2, **HI),
    # event art 640x320
    "event": dict(down="median", trim=0.0, alpha="none", extra=12, extra_thresh=0.03, min_share=0.0005,
                  orphan_dl=0.14, orphan_passes=2, **HI),
    # portraits 192x192 (skin/hair tones as recorded extras: the master palette has no skin ramp)
    "portrait": dict(down="median", trim=0.15, alpha="none", extra=10, extra_thresh=0.025, pre_median=3,
                     min_share=0.001, orphan_dl=0.16, orphan_passes=2, **HI),
    # weapons, drones, set pieces (alpha by border flood from a flat backdrop)
    "prop": dict(down="median", trim=0.125, alpha="flood", outline="sel", bg_tol=0.07, min_share=0.001,
                 orphan_dl=0.16, orphan_passes=2, min_island=12, **HI),
}

GROUP_KIND = {"weapons": "prop", "drones": "prop", "ships": "ship", "cars": "ship", "bg": "scene", "ending": "scene", "events": "event", "portraits": "portrait",
              "props": "prop"}
EXPLORE_KIND = {"tender": "ship", "lamplighter": "ship", "packet-leech": "ship", "s1-a": "scene", "operator": "portrait",
                "lift-car": "event"}


def kind_of(group, aid):
    if group == "explore":
        return EXPLORE_KIND.get(aid, "scene")
    return GROUP_KIND[group]


def ship_extra(aid):
    meta = json.loads((INIT / f"{aid}.json").read_text())
    g = meta["grid"]
    lamp = {}
    if meta.get("lampColors") and (INIT / f"{aid}-lamps.png").exists():
        lamp = dict(lamps=str(INIT / f"{aid}-lamps.png"), lamp_colors=meta["lampColors"], exclude=meta["lampColors"])
    if not g:
        return dict(sil=str(INIT / f"{aid}-sil.png"), protect=None, **lamp)
    t = g.get("tile", 64)
    return dict(sil=str(INIT / f"{aid}-sil.png"), protect=[g["x"], g["y"], g["cols"] * t, g["rows"] * t], **lamp)


def params_for(rec, path=None, overrides=None):
    group, aid = rec["group"], rec["id"]
    kind = kind_of(group, aid)
    p = dict(BASE[kind])
    if kind == "ship":
        p.update(ship_extra(rec.get("hull", "lamplighter" if aid == "tender" else aid)))
    if overrides:
        p.update(overrides)
    return p
