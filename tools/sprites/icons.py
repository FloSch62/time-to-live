"""ICONS atlas (contract v3, hi-bit, "scale": 2) — serious, engraved, muted; light only on small accents (rule 8).

All sizes are atlas pixels (2 per layout unit); every anchor is the frame centre.

  sys-<id>-<state>            40x40  engraved relief glyph on a bevelled tarnished-brass plate with a status lamp;
                                     state = powered | unpowered | damaged | ionised     (icons_sys.py)
  sys-<id>-<state>-sm         28x28  bare glyph (+ a corner status lamp when it fits)
  sys-<id>-glyph              40x40  plain i4 silhouette for wall emblems (= icons.system_glyph(id))
  res-<id> / -sm              40 / 28  salvage ttl payloads spares hull                           (icons_res.py)
  status-<id> / -sm           40 / 28  fire breach low-air pause evasion sensors lock crew-lost boarders
                                       suffocating ion repair target handshake
  handshake-0..3              40x40  HELLO · I HEAR YOU · I HEAR YOU HEAR ME switch plate
  beacon-*                    40x40  relay lamps; beacon-current-0..3 anim                        (icons_map.py)
  ship-lamplighter-0/1        56x32  the cable car on its trolley (anim: lamp blink); -sm 36x20
  glyph-<id> / -dim           40x40  button glyphs (ivory / steel); arrows, check, plus, minus, close also
                                     glyph-<id>-sm / -sm-dim 28x28                                  (icons_ui.py)
  pip-rarity-*                18x18  cut gems;  pip-skill-0|1|2 20x20 socket lamps
  pip-skill-<skill> / -sm     40 / 28  brass relic badge / bare gold symbol                         (icons_badges.py)
  aug-<id>, hazard-<id>, species-<id>  40x40 relic badges (hazard rims: copper / violet / ember by stage)
  car-<id> / -sm              64 / 40  rear cars, keels and the lamplighter                          (icons_cars.py)
  module-<id> / -sm           64 / 40  refit modules in brass-framed crates
"""
from __future__ import annotations

from atlas import Atlas
from px import Img
import icons_badges as BD
import icons_cars as CR
import icons_map as MP
import icons_res as RS
import icons_sys as SY
import icons_ui as UI

SYSTEMS = SY.SYSTEMS
STATES = SY.STATES


def system_glyph(sys_id: str) -> Img:
    """40x40 single-colour ('i4') silhouette of a system glyph, no outline; engraved cuts stay transparent."""
    return SY.system_glyph(sys_id)


def sys_icon(sid: str, state: str, small=False) -> Img:
    return SY.sys_icon(sid, state, small)


def build() -> Atlas:
    A = Atlas("icons", width=1024)
    A.group("systems")
    for sid in SYSTEMS:
        for st in STATES:
            A.add(f"sys-{sid}-{st}", sys_icon(sid, st))
    A.group("systems-sm")
    for sid in SYSTEMS:
        for st in STATES:
            A.add(f"sys-{sid}-{st}-sm", sys_icon(sid, st, small=True))
    A.group("resources")
    for n, im in RS.resources().items():
        A.add(n, im)
    A.group("statuses")
    for n, im in RS.statuses().items():
        A.add(n, im)
    A.group("handshake")
    for n, im in RS.handshake().items():
        A.add(n, im)
    A.group("beacons")
    for n, im in MP.beacons().items():
        A.add(n, im)
    A.anim("beacon-current", [f"beacon-current-{i}" for i in range(4)], fps=6, loop=True)
    A.group("ship")
    for n, im in MP.ship_marker().items():
        A.add(n, im)
    A.anim("ship-lamplighter", ["ship-lamplighter-0", "ship-lamplighter-1"], fps=2, loop=True)
    A.group("glyphs")
    for n, im in UI.glyphs().items():
        A.add(n, im)
    A.group("pips")
    for n, im in UI.pips().items():
        A.add(n, im)
    for n, im in BD.skill_badges().items():
        A.add(n, im)
    A.group("augments")
    for n, im in BD.augments().items():
        A.add(n, im)
    A.group("hazards")
    for n, im in BD.hazards().items():
        A.add(n, im)
    A.group("species")
    for n, im in BD.species().items():
        A.add(n, im)
    A.group("cars")
    for n, im in CR.cars().items():
        A.add(n, im)
    A.group("modules")
    for n, im in CR.modules().items():
        A.add(n, im)
    A.group("glyph-masks")
    for sid in SYSTEMS:
        A.add(f"sys-{sid}-glyph", system_glyph(sid))
    return A
