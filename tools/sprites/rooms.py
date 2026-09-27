"""Rooms atlas (HD, contract v3): the side-view cutaway deck kit at 2x density -> public/sprites/rooms.png/json.

Geometry in atlas px (layout units = px / 2): TILE 64; rows 0..4 ceiling beam, 5..57 back wall, 58..63 floor
plate (row 58 = lit top edge = the floor line crew stand on). Everything dark and low-contrast (rule 8).
Modules: rooms_kit (painting kit), rooms_walls (back walls), rooms_parts (structure, doors, hatches, ladders,
couplers), rooms_consoles (station devices), rooms_props (emblems, windows, lamps, pipes, props, modules).
"""
from __future__ import annotations

from atlas import Atlas
from px import hexof
import rooms_walls as W


def build() -> Atlas:
    atlas = Atlas("rooms", width=2048)
    atlas.group("walls")
    for kind in W.KINDS:
        for v in range(3):
            atlas.add(f"wall-{kind}-{v}", W.wall_tile(kind, v), 0, 0)
    try:
        import rooms_parts as RPT
        RPT.add(atlas)
    except ImportError:
        pass
    try:
        import rooms_consoles as RC
        RC.add(atlas)
    except ImportError:
        pass
    try:
        import rooms_props as RP
        RP.add(atlas)
    except ImportError:
        pass
    return atlas
