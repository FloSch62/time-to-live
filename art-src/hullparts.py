"""A2 hull kit: Krea prompts for the component sprites in subjects.PARTS (group `parts/<id>:a`, 4 seeds each).

Every part is painted alone on a flat dark navy backdrop in the hull recipe's illustration head (ILL2), then cut out
and pixelized by tools/art/assemble_hull.py (objects-pipeline style: largest foreground component, border-flood
alpha). Render sizes are ~4-8x the target, long side <= 2560 (the user's cap), aspect clamped to 4:1, multiples of 16.
"""
import json
from pathlib import Path

import subjects as SUBJ

ISO_PART = ("A single component of a cable car for a game sprite kit, seen in a strict side view (orthographic "
            "elevation), isolated and centered on a flat plain dark navy background with a wide empty margin, lit "
            "from the upper left, nothing else in the picture.")
PART_MAT = ("Worn engineered machinery of the Line in the Reach-dock pattern: tarnished brass, chipped ivory ceramic, "
            "verdigris copper, dark gunmetal, small teal signal lights and warm amber lamps.")
PART_NEG = ("No text, no letters, no numbers, no logo, no border, no frame, no interface, no ground, no shadow on "
            "the floor, no scenery, no wheels on rails, no tram, no cartoon, no toy-like shapes, no faces.")


def render_size(w, h):
    long_target = max(w, h)
    scale = max(4.0, min(8.0, 1024 / long_target))
    gw, gh = w * scale, h * scale
    k = min(1.0, 2560 / max(gw, gh))
    gw, gh = gw * k, gh * k
    # aspect clamp 4:1 (the part is cropped out of the wider frame)
    if gw > 4 * gh:
        gh = gw / 4
    if gh > 4 * gw:
        gw = gh / 4
    q = lambda v: max(512, int(round(v / 16)) * 16)  # noqa: E731
    return q(gw), q(gh)


# version b: the object fills the frame (version a's "wide empty margin" left parts tiny and soft), and the frame
# keeps the part's own aspect (a's 512 floor made small parts square)
ISO_PART_B = ("A single component of a cable car for a game sprite kit, seen in a strict side view (orthographic "
              "elevation), large and centered, filling most of the frame with only a small even margin, on a flat "
              "plain dark navy background, lit from the upper left, nothing else in the picture.")


def render_size_b(w, h):
    aspect = w / h
    long_side = min(2560, max(768, 8 * max(w, h)))
    gw, gh = (long_side, long_side / aspect) if aspect >= 1 else (long_side * aspect, long_side)
    short = min(gw, gh)
    if short < 384:
        k = 384 / short
        gw, gh = gw * k, gh * k
    k = min(1.0, 2560 / max(gw, gh))
    q = lambda v: max(256, int(round(v * k / 16)) * 16)  # noqa: E731
    return q(gw), q(gh)


INIT_PARTS = Path(__file__).resolve().parent / "init" / "parts"
ISO_INIT = ("A single component of a cable car for a game sprite kit, in strict side view, on a flat plain dark navy "
            "background. Keep the exact layout, proportions and silhouette of the input image; repaint it as finely "
            "detailed, weathered, hard-edged game art: riveted plates, worn edges, chips, grime and small highlights.")
EXTRA_INIT = {"rear-cap-5": ((56, 432), SUBJ.PARTS["rear-cap"][1])}


def install(assets, head):
    for pid, (size, brief) in list(SUBJ.PARTS.items()) + list(EXTRA_INIT.items()):
        entry = {"size": size, "gen": render_size(*size), "n": 4, "versions": {
            "a": {"prompt": f"{head} {ISO_PART} {brief}. {PART_MAT} {PART_NEG}"},
        }}
        entry["versions"]["b"] = {"prompt": f"{head} {ISO_PART_B} {brief}. {PART_MAT} {PART_NEG}",
                                  "gen": render_size_b(*size), "n": 4}
        init = INIT_PARTS / f"{pid}-init.png"
        if init.exists():
            meta = json.loads(init.with_name(f"{pid}.json").read_text())
            entry["versions"]["i"] = {"prompt": f"{head} {ISO_INIT} {brief}. {PART_MAT} {PART_NEG}",
                                      "init": str(init), "denoise": 0.5, "gen": tuple(meta["gen"]), "n": 3}
            # i2: denoise 0.5 left the flat body strips almost as drawn; 0.65 paints the material in
            entry["versions"]["i2"] = dict(entry["versions"]["i"], denoise=0.65)
        assets[f"parts/{pid}"] = entry


# ------------------------------------------------------------------------------------------------ blend pass
HULLS = Path(__file__).resolve().parent / "hulls"
BLEND_HEAD = ("Keep the input image exactly: the same car, the same silhouette, the same parts in the same places. "
              "Repaint it only lightly as one finished, consistently lit hi-bit game sprite: unify the light from the "
              "upper left, the brass and ivory tones and the wear across the part seams, crisp edges, no blur.")


def install_blend(assets, head, side, ships, mat, neg):
    for vid in ("glasswing", "switchback"):
        lay = HULLS / f"{vid}.json"
        init = HULLS / f"{vid}-blend-init.png"
        if not lay.exists():
            continue
        import json as _json
        W, H = _json.loads(lay.read_text())["canvas"]
        assets[f"hulls/{vid}"] = {"size": (W, H), "gen": (W * 2, H * 2), "n": 3, "versions": {
            v: {"prompt": f"{head} {side} {BLEND_HEAD} {ships[vid]} {mat} {neg}", "init": str(init),
                "mask": str(HULLS / f"{vid}-blend-mask.png"), "denoise": d}
            for v, d in (("blend", 0.3), ("blend2", 0.4))}}


# ------------------------------------------------------------------------------------------------ drive trolley
TROLLEY_INIT = Path(__file__).resolve().parent / "init" / "trolley"
TROLLEY_PROMPT = ("A detailed game sprite of a cable-car grip carriage (the drive trolley of an aerial ropeway car), "
                  "in strict side view, exactly following the layout of the input sketch, on a flat pure magenta "
                  "background. Grooved dark steel sheaves with spokes and brass hubs ride on top of a thick braided "
                  "green carrier cable; a riveted tarnished-brass axle beam joins them; a dark gunmetal drive-motor "
                  "housing with cooling fins and a brass gear train sits on the beam; a brass drop plate in front of "
                  "the cable ends in dark steel grip jaws clamping the cable from below; under it a pivot pin and two "
                  "brass hanger struts with coil-spring dampers and a tie bar. Small amber marker lamps, a teal "
                  "indicator light, rivets, worn edges, top-left light. Clean hard-edged detailed illustration, crisp "
                  "edges, restrained shading. No train, no rails, no railway bogie, no wheels under anything, no "
                  "text, no ground, no scenery.")


def install_trolley(assets):
    for kind in ("standard", "heavy", "car"):
        init = TROLLEY_INIT / f"{kind}-init.png"
        if not init.exists():
            continue
        meta = json.loads((TROLLEY_INIT / f"{kind}.json").read_text())
        # d45..d65: sketch v1 (1 px per design unit); e55/e65: sketch v2 (1.35 px per unit, compact hanger). The
        # init file is regenerated from code; each candidate keeps a snapshot of the init it was painted from.
        assets[f"trolley/{kind}"] = {"size": tuple(meta["size"]), "gen": tuple(meta["gen"]), "n": 3, "versions": {
            f"{p}{int(d * 100)}": {"prompt": TROLLEY_PROMPT, "init": str(init), "denoise": d}
            for p, ds in (("d", (0.45, 0.55, 0.65)), ("e", (0.55, 0.65)), ("f", (0.55, 0.65))) for d in ds}}
        # f55/f65: sketch v3 (1.8 px per unit, sheave pair ~37 % of the Lamplighter, wide sprung stance)


# ------------------------------------------------------------------------------------------------ fittings (keyed)
# version m: the fitting on a pure magenta key backdrop (the flat navy backdrop made border-flood alpha eat every
# dark gunmetal part); cut by chroma key at render resolution and composited into the hull init before the repaint.
ISO_KEY = ("A single component of a cable car for a game sprite kit, seen in a strict side view (orthographic "
           "elevation), large and centered, filling most of the frame with a small even margin, on a flat plain "
           "pure magenta (#FF00FF) background, lit from the upper left, nothing else in the picture.")
FITTING_BRIEFS = {
    "collimator-pair": ((224, 72), "a pair of long horizontal brass collimator lens barrels, one above the other, "
                                   "mounted on two riveted brass brackets with a bolted base plate on the left, "
                                   "several engraved brass rings along each barrel, a glowing teal glass lens at "
                                   "the right end of the upper barrel and a glowing amber glass lens at the right "
                                   "end of the lower barrel, small brass lens caps hanging on short chains below "
                                   "the lenses, a precise optical survey instrument"),
    "saddle-plate": ((104, 14), "a long low riveted brass saddle plate for bolting a trolley hanger to a car roof: a "
                                "flat bevelled base with a row of heavy bolts and two raised clevis lugs with pins "
                                "near its ends, worn tarnished brass"),
    "survey-horns": ((64, 76), "two brass listening horns, large ear-trumpet-shaped acoustic horns with wide flared "
                               "bell mouths facing left, mounted one above the other on a slim swivel mast with a "
                               "brass pivot collar, the mast standing on a small riveted brass base plate"),
}


def install_keyed(assets, head):
    for pid in ("prism-housing", "collimators", "survey-horns", "drone-cradle", "retrieval-crane", "saddle-plate",
                "collimator-pair"):
        size, brief = FITTING_BRIEFS.get(pid, SUBJ.PARTS.get(pid, (None, None)))
        assets.setdefault(f"parts/{pid}", {"size": size, "gen": render_size_b(*size), "n": 4, "versions": {}})
        assets[f"parts/{pid}"]["versions"]["m"] = {
            "prompt": f"{head} {ISO_KEY} {brief}. {PART_MAT} {PART_NEG} No magenta on the object itself.",
            "gen": render_size_b(*size), "n": 4}


# ------------------------------------------------------------------------------------------------ hulls (A2, v5)
INIT_DIR = Path(__file__).resolve().parent / "init"
HULL_V5 = ("Keep the silhouette, the proportions and every roof fitting of the input exactly. Paint a finished, "
           "detailed, weathered game sprite of this cable car, lit from the upper left: chipped and grimy ivory "
           "ceramic plates with rust streaks, framed by riveted tarnished brass ribs and straps, verdigris copper "
           "pipe runs, small brass-rimmed portholes, the big round glass guide lamp glowing warm amber in the nose "
           "and the lit cab window above it, riveted air tanks strapped under the belly. Only a flat saddle plate on "
           "the roof where the drive trolley attaches: no trolley and no cable above it. No wheels, no bogies, no "
           "rails anywhere: the car hangs, it never rolls.")


def install_hulls_v5(assets, head, side, ships, mat, neg):
    for vid in ("glasswing", "switchback"):
        key = f"ships/{vid}"
        if key not in assets or not (INIT_DIR / f"{vid}.json").exists():
            continue
        meta = json.loads((INIT_DIR / f"{vid}.json").read_text())
        if not meta.get("fittings"):
            continue
        assets[key]["versions"]["v5"] = {
            "prompt": f"{head} {side} {HULL_V5} {ships[vid]} {mat} {neg}",
            "init": str(INIT_DIR / f"{vid}-init.png"), "mask": str(INIT_DIR / f"{vid}-mask.png"),
            "denoise": 0.8, "gen": tuple(meta["gen"]), "size": tuple(meta["canvas"]), "n": 4}
        assets[key]["versions"]["v5b"] = dict(assets[key]["versions"]["v5"], denoise=0.75)
        # v5c: richer init (patched plates, pipes, rust, portholes), wide trolley saddle, nose keep 0.85
        assets[key]["versions"]["v5c"] = dict(assets[key]["versions"]["v5"], denoise=0.8)
        # fam: the family init (the Lamplighter's painted body resampled onto the sister, hull_v5.py family-init),
        # body mask 0.62, fittings 0.45; fam2 repaints a little harder
        assets[key]["versions"]["fam"] = dict(assets[key]["versions"]["v5"], denoise=0.75)
        assets[key]["versions"]["fam2"] = dict(assets[key]["versions"]["v5"], denoise=0.9)
        # fam3: roof fittings kept under the carrier (<= 58 px), collimators tucked under the lamp
        assets[key]["versions"]["fam3"] = dict(assets[key]["versions"]["v5"], denoise=0.75)
        # fam4: the sister's own side (rib rhythm, ports, straps; Glasswing collimator barrels, Switchback lower
        # retrieval shutters) blocked into the family init, body mask 0.8
        assets[key]["versions"]["fam4"] = dict(assets[key]["versions"]["v5"], denoise=0.8)
        anchor = str(Path(__file__).resolve().parent / "refs" / "lamplighter-anchor.png")
        # min / minr: a minimal volume init (capsule, nose, keel, rails, saddle, job features; hulls.py minimal=True)
        # repainted in full like the Lamplighter was, with the lamplighter pattern described in words (min) or also
        # shown as a style reference (minr)
        MINP = (f"{head} {side} {ships[vid]} Keep the outline, the nose, the lamp and every roof fitting of the "
                f"input. Richly detailed: riveted brass ribs and straps, verdigris pipe runs, brass-rimmed "
                f"portholes, hatches and inspection covers, rust streaks and chips on the ivory plates, a dark "
                f"gunmetal keel band with strapped air tanks. {mat} {neg} No wheels, no bogies, no rails.")
        assets[key]["versions"]["min"] = dict(assets[key]["versions"]["v5"], denoise=0.8, prompt=MINP, n=3)
        assets[key]["versions"]["minr"] = dict(assets[key]["versions"]["min"], refs=[{"path": anchor}],
                                               strength=0.45, shift=1.5)
        # min2 / minr2: the same with the Glasswing collimator barrels protected in the mask (keep 0.45)
        assets[key]["versions"]["min2"] = dict(assets[key]["versions"]["min"])
        assets[key]["versions"]["minr2"] = dict(assets[key]["versions"]["minr"])
        # minr3: keel tanks and the Switchback nose grille repainted harder (keep 0.85 / 0.7)
        assets[key]["versions"]["minr3"] = dict(assets[key]["versions"]["minr"])
        # min4 / minr4 (Glasswing): the keyed Krea collimator pair bolted to the forward flank
        assets[key]["versions"]["min4"] = dict(assets[key]["versions"]["min"])
        assets[key]["versions"]["minr4"] = dict(assets[key]["versions"]["minr"])
        # v5r: the Lamplighter final as style reference (the recipe that made the rear/keel cars one family)
        anchor = str(Path(__file__).resolve().parent / "refs" / "lamplighter-anchor.png")
        assets[key]["versions"]["v5r"] = dict(
            assets[key]["versions"]["v5"], denoise=0.8, refs=[{"path": anchor}], strength=0.5, shift=1.5,
            prompt=f"{head} {side} {HULL_V5} Match the materials, panel pattern, rivets, pipe runs, lit portholes, "
                   f"keel band and lamp of the reference car exactly: the same family of cars. {ships[vid]} {mat} {neg}")
