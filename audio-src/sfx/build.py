"""Build every TIME TO LIVE sound cue (contract §8.2) from ranked Stable Audio elements + synthesized layers, master
them to their loudness tier, deliver public/audio/sfx/<id>[-n].ogg and public/audio/sfx.json, and keep a provenance
manifest (audio-src/sfx/manifest.json: every layer with its element take, prompt, seed and gain).

  /home/clab/projects/clab/faultline/.work/sfx/.venv/bin/python audio-src/sfx/build.py [cue ...]

Loudness tiers are peak momentary loudness (K-weighted, 100 ms; lib.peak_loudness) for one-shots and mean loudness for
loops. UI sits lowest, weapons and hits in the middle, explosions and the ship's end loudest. Peaks <= -3 dBFS."""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf
import lib, rank
import synth as S

ROOT = lib.HERE.parents[1]
PUB = ROOT / "public" / "audio" / "sfx"
MASTERS = lib.HERE / "masters"
RANKED = json.loads((lib.EL / "ranked.json").read_text())
USED = []                          # provenance of the element takes used by the cue being built


def el(name, pick=0, length=None, speed=1.0, hp=None, lp=None, fin=0.001, fout=0.03, start=0.0):
    """A cropped element take, peak-normalised to 1, as stereo; pick = rank index."""
    take = RANKED[name][pick % len(RANKED[name])]
    y, _ = rank.crop(take)
    y = lib.stereo(y)
    if start:
        y = y[int(start * lib.SR):]
    y = lib.varispeed(y, speed)
    if length:
        y = y[: int(length * lib.SR)]
    y = lib.bandpass(y, hp, lp)
    y = lib.fade(y, fin, fout)
    USED.append(dict(element=name, rank=pick % len(RANKED[name]), file=take["file"], prompt=take["prompt"],
                     seed=take["seed"], score=take["score"], speed=speed, length=length, hp=hp, lp=lp))
    return y / (np.abs(y).max() + 1e-9)


def bed(name, pick=0, seconds=4.0):
    take = RANKED[name][pick % len(RANKED[name])]
    x = lib.load_take(take["file"])
    y, _ = lib.crop_bed(x, keep=seconds)
    USED.append(dict(element=name, rank=pick % len(RANKED[name]), file=take["file"], prompt=take["prompt"],
                     seed=take["seed"], score=take["score"], bed_seconds=seconds))
    return lib.stereo(y) / (np.abs(y).max() + 1e-9)


mix = S.mix
room = lambda x, t=0.22, a=0.19: lib.reflections(x, t, a)


# ------------------------------------------------------------------------------------------------ recipes
# cue: (variants, target dB, drive dB, loop, builder(v) -> stereo)
R = {}


def cue(name, variants=1, target=-18.0, drive=0.0, loop=False, lp=16000):
    def deco(fn):
        R[name] = dict(variants=variants, target=target, drive=drive, loop=loop, fn=fn, lp=lp)
        return fn
    return deco


# weapons -------------------------------------------------------------------------------------------------------
@cue("laser-fire", 3, -13, 2)
def _(v):
    return room(mix((S.laser(v), 0, 1.0), (el("elec_crack", v, 0.12, hp=1500), 0.0, 0.18),
                    (el("relay_clack", v, 0.08), 0.0, 0.10)), 0.16, 0.12)


@cue("laser-heavy", 2, -11, 2.5)
def _(v):
    return room(mix((S.laser(v, heavy=True), 0, 1.0), (el("heavy_zap", v, 0.4, hp=200), 0.0, 0.3),
                    (el("elec_crack", v + 1, 0.15, hp=1500), 0.0, 0.18)), 0.2, 0.14)


@cue("ion-fire", 2, -13, 1.5)
def _(v):
    return room(mix((S.ion(v), 0, 1.0), (el("arc_buzz", v, 0.35, hp=800, fout=0.2), 0.02, 0.18)), 0.2, 0.14)


@cue("beam-fire", 2, -13, 1.5)
def _(v):
    return room(mix((S.beam(v), 0, 1.0), (el("arc_buzz", v, 1.3, hp=300, fout=0.25), 0.0, 0.25)), 0.2, 0.12)


@cue("payload-launch", 2, -12, 2)
def _(v):
    return room(mix((el("pneu_launch", v, 1.0, fout=0.3), 0, 1.0), (S.sub_thump(95, 42, 0.4, 0.12), 0.0, 0.7),
                    (S.whoosh(0.5, 500, 3500, 13 + v, 1.0, 0.5), 0.05, 0.25)), 0.2, 0.12)


@cue("flak-fire", 2, -12, 2.5)
def _(v):
    return room(mix((el("cannon", v, 0.8, fout=0.25), 0, 1.0), (S.sub_thump(120, 50, 0.3, 0.08), 0, 0.6),
                    (S.laser(v + 1)[: int(0.06 * lib.SR)], 0.0, 0.25),
                    (el("elec_crack", v + 2, 0.08, hp=2000), 0.05, 0.12),
                    (el("elec_crack", v + 3, 0.08, hp=2000), 0.1, 0.1)), 0.2, 0.12)


@cue("drone-launch", 1, -16, 1)
def _(v):
    return room(mix((el("pneu_launch", 1, 0.6, hp=300, fout=0.2), 0, 0.7), (S.zap_up(0.3), 0.02, 0.35),
                    (el("servo", 0, 0.5), 0.12, 0.4)), 0.16, 0.12)


# hits ----------------------------------------------------------------------------------------------------------
@cue("shield-hit", 3, -14, 2)
def _(v):
    """The ward mesh (charged ward-wire lattice) catches a bolt: electric crackle + a wire twang, grounded away."""
    return room(mix((S.shield_ripple(v), 0, 0.8), (el("elec_crack", v, 0.2, hp=1200), 0, 0.5),
                    (el("cable_twang", v, 0.5, speed=1.25, hp=300, fout=0.25), 0.005, 0.55),
                    (S.ion_crackle(v, 0.3), 0.01, 0.25)), 0.18, 0.14)


@cue("shield-up", 1, -19, 0)
def _(v):
    return room(mix((S.shield_sweep(True), 0, 1.0), (el("powerup", 0, 0.8, hp=300, fout=0.3), 0.0, 0.25)), 0.2, 0.14)


@cue("shield-down", 1, -17, 1)
def _(v):
    return room(mix((S.shield_sweep(False), 0, 1.0), (el("elec_crack", 1, 0.2, hp=1000), 0, 0.5),
                    (el("powerdown", 0, 0.9, hp=200, fout=0.4), 0.02, 0.35)), 0.2, 0.14)


@cue("hull-hit-small", 3, -12, 2.5)
def _(v):
    return room(mix((el("metal_clang", v, 0.7, fout=0.3), 0, 1.0), (S.sub_thump(110, 50, 0.3, 0.07), 0, 0.6),
                    (el("debris", v, 0.5, hp=800, fout=0.3), 0.06, 0.15)), 0.18, 0.14)


@cue("hull-hit-big", 2, -9, 3)
def _(v):
    return room(mix((el("metal_heavy", v, 1.3, fout=0.4), 0, 1.0), (el("explosion", v, 1.0, fout=0.4), 0.0, 0.55),
                    (S.sub_thump(80, 32, 0.6, 0.18), 0, 0.8), (el("debris", v + 1, 1.2, hp=500, fout=0.5), 0.12, 0.22)),
                0.25, 0.14)


@cue("miss", 2, -18, 0)
def _(v):
    return mix((S.miss(v), 0, 1.0), (el("whoosh", v, 0.7, hp=600, fout=0.2), 0.0, 0.35))


@cue("ion-hit", 2, -14, 1.5)
def _(v):
    return room(mix((S.ion_crackle(v), 0, 1.0), (el("elec_crack", v + 2, 0.25, hp=1200), 0, 0.5),
                    (el("arc_buzz", v, 0.4, hp=1000, fout=0.3), 0.02, 0.2)), 0.18, 0.12)


@cue("explosion-room", 3, -9, 3)
def _(v):
    return room(mix((el("explosion", v, 1.8, fout=0.6), 0, 1.0), (S.sub_thump(70, 28, 0.9, 0.25), 0, 0.9),
                    (el("debris", v, 1.5, hp=400, fout=0.6), 0.15, 0.25), (el("metal_clang", v + 3, 0.5, fout=0.2), 0.0, 0.25)),
                0.3, 0.14)


@cue("ship-destroyed", 1, -8, 3)
def _(v):
    """A machine powering down: a task ending. Two muffled blasts, the power winding down, one last relay click."""
    return room(mix((el("explosion_big", 0, 3.2, lp=5000, fout=1.2), 0, 1.0),
                    (el("explosion", 1, 1.5, lp=3500, fout=0.6), 0.55, 0.55),
                    (S.machine_wind_down(2.8), 0.3, 0.45), (el("powerdown", 0, 2.4, fout=0.8), 0.4, 0.5),
                    (S.sub_thump(60, 25, 1.4, 0.4), 0, 0.9), (el("relay_clack", 0, 0.1), 3.05, 0.35),
                    (S.descending_tone(520, 260, 0.9, "sine"), 3.1, 0.12)), 0.35, 0.16)


@cue("breach", 2, -12, 2)
def _(v):
    return room(mix((el("metal_tear", v, 0.8, fout=0.25), 0, 1.0), (S.sub_thump(90, 35, 0.5, 0.15), 0, 0.7),
                    (el("air_rush", v, 1.8, fin=0.03, fout=1.0), 0.08, 0.6)), 0.25, 0.14)


# loops -------------------------------------------------------------------------------------------------------------
@cue("fire-loop", 1, -24, 0, loop=True)
def _(v):
    y = bed("fire", 0, 8.0)
    return lib.loopable(y, 0.8)


@cue("repair-loop", 1, -26, 0, loop=True)
def _(v):
    a = bed("ratchet", 0, 4.5)
    s = bed("sparks", 0, 4.5)
    s = lib.loopable(s, 0.3)
    s = np.concatenate([s, s, s])[: len(a)]
    y = a * 0.9 + lib.bandpass(s, 1500, None) * 0.25
    return lib.loopable(y, 0.5)


@cue("hop-charge", 1, -24, 0, loop=True)
def _(v):
    """The handshake charge: the drive trolley's spool-up hum with three rhythmic handshake pulses per 2 s cycle."""
    y = S.handshake_pulse_loop(2.0)
    n = len(y)
    mo = bed("motor_spool", 0, 3.0)
    mo = lib.loopable(np.concatenate([mo, mo])[: n + int(0.4 * lib.SR)], 0.4)[:n]
    return lib.stereo(y) * 0.85 + lib.bandpass(mo, 120, 6000) * 0.3


@cue("air-alarm", 1, -22, 0, loop=True)
def _(v):
    return lib.stereo(S.air_alarm(1.2))


@cue("hull-alarm", 1, -16, 1)
def _(v):
    return S.hull_alarm()


# ship & crew ----------------------------------------------------------------------------------------------------
@cue("door-open", 2, -21, 0)
def _(v):
    return room(mix((el("door_slide", v, 0.9, fout=0.25), 0, 1.0), (el("air_brake", v, 0.4, fout=0.2), 0.0, 0.25)),
                0.15, 0.1)


@cue("door-close", 2, -20, 0)
def _(v):
    return room(mix((el("door_thud", v, 0.8, fout=0.25), 0, 1.0),), 0.15, 0.1)


@cue("repair-done", 1, -19, 0)
def _(v):
    return mix((el("relay_clack", 1, 0.1), 0, 0.5), (S.repair_done(), 0.03, 1.0))


@cue("crew-select", 1, -25, 0)
def _(v):
    return S.crew_select()


@cue("crew-move", 1, -26, 0)
def _(v):
    return S.crew_move()


@cue("crew-fight", 3, -18, 1.5)
def _(v):
    return room(mix((el("scuffle", v, 0.9, fout=0.25), 0, 1.0),), 0.15, 0.1)


@cue("crew-stopped", 1, -19, 0)
def _(v):
    return room(mix((el("relay_clack", 2, 0.1), 0, 0.5), (S.descending_tone(640, 220, 0.8, "tri"), 0.02, 0.6),
                    (S.sub_thump(90, 45, 0.4, 0.12), 0.0, 0.4)), 0.2, 0.12)


@cue("boarders", 1, -15, 1.5)
def _(v):
    stab = S.drone_hit(1.4, 73.4)
    return room(mix((el("clamp", 0, 0.6, fout=0.2), 0, 1.0), (stab, 0.05, 0.6),
                    (S.hull_alarm()[: int(0.4 * lib.SR)], 0.35, 0.35)), 0.25, 0.14)


@cue("teleport-in", 2, -16, 1.5)
def _(v):
    return room(mix((S.zap_up(0.3), 0, 0.5), (el("clamp", v, 0.6, fout=0.2), 0.26, 1.0),
                    (el("heavy_zap", v, 0.3, hp=400, fout=0.2), 0.24, 0.3)), 0.2, 0.12)


# systems & UI ---------------------------------------------------------------------------------------------------
@cue("power-up", 1, -24, 0)
def _(v):
    return mix((S.power(True), 0, 1.0), (el("relay_clack", 0, 0.08), 0, 0.3))


@cue("power-down", 1, -25, 0)
def _(v):
    return mix((S.power(False), 0, 1.0), (el("relay_clack", 1, 0.08), 0, 0.25))


@cue("power-denied", 1, -23, 0)
def _(v):
    return S.power_denied()


@cue("weapon-charged", 1, -22, 0)
def _(v):
    return S.weapon_charged()


@cue("weapon-select", 1, -24, 0)
def _(v):
    return mix((S.weapon_select(), 0, 1.0), (el("switch", 0, 0.12), 0, 0.2))


@cue("hop-ready", 1, -19, 0)
def _(v):
    return S.hop_ready()


@cue("hop", 1, -12, 2)
def _(v):
    """The relay's switchgear throws the switch (a heavy relay clunk), then the trolley races down the carrier: a rising
    cable thrum and wheel hiss that swell and fade away down the line."""
    n = int(3.4 * lib.SR)
    t = np.arange(n) / lib.SR
    wheel = bed("wheel_hiss", 0, 4.5)[:n]
    wheel = lib.stereo(S.pad_to(wheel, n))
    away = np.clip((t - 0.25) / 0.5, 0, 1) * np.exp(-np.clip(t - 1.3, 0, None) / 0.7)
    wheel = S.sweep_filter(wheel, np.where(t < 1.3, 9000, 9000 * np.exp(-(t - 1.3) / 0.9)) + 300, "lowpass", 0.7) * away[:, None]
    thrum = S.trolley_away(1.3, 1.9)
    return room(mix((el("switchgear", 0, 0.8, fout=0.3), 0, 1.0), (el("relay_clack", 0, 0.08), 0.0, 0.4),
                    (el("cable_twang", 1, 1.2, speed=0.8, fout=0.6), 0.03, 0.35),
                    (thrum, 0.12, 0.75), (lib.pan(wheel, -0.2) * 0.5 + lib.pan(wheel, 0.4) * 0.5, 0.12, 0.9),
                    (S.whoosh(1.4, 400, 4000, 7, 0.9, 0.35), 0.6, 0.45)), 0.3, 0.14)


@cue("arrive", 1, -18, 0)
def _(v):
    """The trolley brakes on the carrier and stops at a relay: squeal and friction slowing, a hiss, the relay clicks."""
    n = int(1.6 * lib.SR)
    t = np.arange(n) / lib.SR
    wheel = lib.stereo(S.pad_to(bed("wheel_hiss", 1, 4.5), n))
    wheel = S.sweep_filter(wheel, 6000 * np.exp(-t / 0.6) + 300, "lowpass", 0.7) * np.exp(-t / 0.5)[:, None]
    return room(mix((wheel, 0, 0.7), (S.brake_squeal(1.6), 0.0, 0.45), (el("cable_brake", 0, 1.2, lp=6000, fout=0.4), 0.05, 0.3),
                    (el("air_brake", 0, 0.7, fout=0.3), 1.45, 0.6), (el("switchgear", 1, 0.5, fout=0.2), 1.55, 0.35),
                    (el("relay_clack", 0, 0.08), 1.62, 0.4), (S.chime([880, 659.3], 0.12, 0.9, 0.5, 0.25, 1.0), 1.7, 0.35)),
                0.22, 0.12)


@cue("handshake-1", 1, -21, 0)
def _(v):
    return S.handshake(1)


@cue("handshake-2", 1, -21, 0)
def _(v):
    return S.handshake(2)


@cue("handshake-3", 1, -20, 0)
def _(v):
    return S.handshake(3)


@cue("cable-creak", 1, -32, 0, loop=True)
def _(v):
    """Ambience: the carrier cable creaking under the car's weight."""
    return lib.loopable(lib.bandpass(bed("cable_creak", 0, 8.0), 60, 9000), 1.0)


@cue("couple", 1, -15, 1.5)
def _(v):
    """Cars coupling on the carrier: a heavy coupler latches, chain and cable take up the tension."""
    return room(mix((el("clamp", 0, 0.6, fout=0.2), 0, 1.0), (el("switchgear", 2, 0.6, fout=0.25), 0.04, 0.6),
                    (el("scrap", 1, 0.6, hp=500, fout=0.3), 0.08, 0.3), (el("cable_twang", 2, 1.3, speed=0.75, fout=0.6), 0.12, 0.5),
                    (S.sub_thump(90, 40, 0.4, 0.12), 0.0, 0.5)), 0.25, 0.14)


@cue("uncouple", 1, -16, 1)
def _(v):
    """A coupler latch releases with a clank."""
    return room(mix((el("switch", 1, 0.3), 0, 0.7), (el("air_brake", 1, 0.5, fout=0.25), 0.05, 0.5),
                    (el("metal_clang", 2, 0.6, fout=0.25), 0.12, 0.8), (el("cable_twang", 3, 0.8, speed=1.1, fout=0.4), 0.14, 0.25)),
                0.22, 0.12)


@cue("refit", 1, -17, 1)
def _(v):
    """A room module refitted: ratchets and bolts, the module seats with a clunk, a short power-up hum."""
    rat = bed("ratchet", 0, 4.5)
    return room(mix((rat[: int(0.55 * lib.SR)] * np.linspace(0.3, 1, int(0.55 * lib.SR))[:, None], 0, 0.6),
                    (el("scrap", 0, 0.4, fout=0.2), 0.3, 0.4), (rat[int(1.5 * lib.SR): int(1.9 * lib.SR)], 0.55, 0.6),
                    (el("clamp", 1, 0.6, fout=0.25), 1.0, 1.0), (el("switchgear", 0, 0.5, fout=0.2), 1.02, 0.4),
                    (S.warm_hum(0.9, 110.0), 1.2, 0.35), (el("powerup", 0, 0.7, hp=200, fout=0.3), 1.15, 0.3),
                    (el("relay_clack", 1, 0.08), 1.9, 0.4)), 0.22, 0.12)


@cue("ui-click", 1, -27, 0)
def _(v):
    return S.ui_click()


@cue("ui-hover", 1, -33, 0)
def _(v):
    return S.ui_hover()


@cue("ui-back", 1, -27, 0)
def _(v):
    return S.ui_back()


@cue("ui-open", 1, -26, 0)
def _(v):
    return S.ui_open()


@cue("buy", 1, -20, 0)
def _(v):
    return mix((el("coins", 0, 0.6, fout=0.2), 0, 0.8), (S.buy_chime(), 0.03, 0.8))


@cue("sell", 1, -21, 0)
def _(v):
    return mix((el("coins", 1, 0.6, fout=0.2), 0, 0.8), (S.sell_chime(), 0.03, 0.7))


@cue("salvage-pickup", 2, -20, 0)
def _(v):
    return mix((el("scrap", v, 0.6, fout=0.2), 0, 0.9), (S.pickup_blip(), 0.02, 0.45))


@cue("event-open", 1, -23, 0)
def _(v):
    return mix((el("squelch", 0, 0.5, fout=0.2), 0, 0.6), (S.chime([659.3, 880.0], 0.08, 0.8, 0.5, 0.25, 1.0), 0.05, 0.6))


@cue("map-open", 1, -24, 0)
def _(v):
    return mix((el("whoosh", 1, 0.6, lp=4000, fout=0.3), 0, 0.5), (el("relay_clack", 1, 0.08), 0.0, 0.5),
               (S.ui_open(), 0.02, 0.5))


@cue("seal-advance", 1, -16, 1)
def _(v):
    return room(mix((S.drone_hit(2.4, 55.0), 0, 0.8), (el("slam_far", 0, 3.0, fout=1.0), 0.0, 0.9),
                    (S.bell(233.1, 2.0, 0.3, 5) * 0.3, 0.05, 0.4)), 0.3, 0.12)


@cue("lamp-on", 1, -22, 0)
def _(v):
    return mix((el("lamp_buzz", 0, 1.2, fout=0.4), 0, 1.0), (S.warm_hum(0.8, 100.0), 0.02, 0.15))


@cue("glass-bell", 2, -18, 0)
def _(v):
    return mix((el("glass_bell", v, 5.0, fout=1.5), 0, 1.0), (S.glass_bell_synth([1046.5, 880.0][v], 4.0), 0.0, 0.25))


@cue("radio-squelch", 2, -21, 0)
def _(v):
    return mix((el("squelch", v, 1.0, fout=0.2), 0, 1.0),)


@cue("page-lamp", 1, -19, 0)
def _(v):
    """The Relay Seven page: the relay clicks, the lamp buzzes on, a switchboard bell strikes twice."""
    return mix((el("relay_clack", 0, 0.1), 0, 0.6), (el("lamp_buzz", 0, 1.2, fout=0.4), 0.02, 0.6),
               (S.page_bell(), 0.25, 0.9))


@cue("victory-sting", 1, -16, 0)
def _(v):
    return S.victory_sting()


@cue("defeat-sting", 1, -17, 0)
def _(v):
    return S.defeat_sting()


@cue("veil-on", 1, -19, 0)
def _(v):
    return room(S.lamps_off(False), 0.25, 0.14)


@cue("veil-off", 1, -19, 0)
def _(v):
    return room(S.lamps_off(True), 0.25, 0.14)


CONTRACT = ("laser-fire laser-heavy ion-fire beam-fire payload-launch flak-fire shield-hit shield-up shield-down "
            "hull-hit-small hull-hit-big miss explosion-room ship-destroyed fire-loop breach air-alarm hull-alarm "
            "door-open door-close repair-loop repair-done crew-select crew-move crew-fight crew-stopped boarders "
            "power-up power-down power-denied weapon-charged weapon-select hop-charge hop-ready hop arrive ui-click "
            "ui-hover ui-back ui-open buy sell salvage-pickup event-open map-open seal-advance lamp-on glass-bell "
            "radio-squelch page-lamp victory-sting defeat-sting drone-launch veil-on veil-off ion-hit teleport-in "
            # direction v2 additions (coordinator, 2026-09-27): the cable car, the handshake, the modular tender
            "handshake-1 handshake-2 handshake-3 cable-creak couple uncouple refit").split()


def build(name):
    spec = R[name]
    files, meta = [], []
    for v in range(spec["variants"]):
        USED.clear()
        y = spec["fn"](v)
        if not spec["loop"]:
            y = lib.fade(y, 0.001, 0.02)
            # trim trailing silence (below -60 dB of the peak), keep a short fade
            m = np.abs(lib.mono(y))
            thr = m.max() * 10 ** (-60 / 20)
            last = int(np.nonzero(m > thr)[0][-1]) if (m > thr).any() else len(y)
            y = lib.fade(y[: min(len(y), last + int(0.03 * lib.SR))], 0.0, 0.03)
        y = lib.master(y, spec["target"], spec["drive"], loop=spec["loop"], lp=spec["lp"])
        fname = f"{name}.ogg" if spec["variants"] == 1 else f"{name}-{v + 1}.ogg"
        MASTERS.mkdir(parents=True, exist_ok=True)
        sf.write(MASTERS / fname.replace(".ogg", ".wav"), y.astype(np.float32), lib.SR, subtype="FLOAT")
        lib.write_ogg(PUB / fname, y)
        d, sr = lib.decode(PUB / fname)
        level = lib.mean_loudness(d) if spec["loop"] else lib.peak_loudness(d)
        meta.append(dict(file=fname, seconds=round(len(d) / sr, 3), samples=len(d), samples_master=len(y),
                         peak_dbfs=round(20 * np.log10(np.abs(d).max() + 1e-12), 2), level_db=round(level, 1),
                         layers=list(USED)))
        files.append(f"audio/sfx/{fname}")
    return files, meta


def main():
    only = sys.argv[1:]
    missing = [c for c in CONTRACT if c not in R]
    assert not missing, missing
    man_path = lib.HERE / "manifest.json"
    manifest = json.loads(man_path.read_text()) if man_path.exists() and only else {}
    pub_json = ROOT / "public" / "audio" / "sfx.json"
    out = json.loads(pub_json.read_text()) if pub_json.exists() and only else {}
    for name in CONTRACT:
        if only and name not in only:
            continue
        files, meta = build(name)
        spec = R[name]
        out[name] = dict(files=files, gain=0.0, loop=spec["loop"])
        if spec["loop"]:                               # exact loop bounds (the decoded file may carry codec padding)
            out[name].update(loopStart=0.0, loopEnd=round(meta[0]["samples_master"] / lib.SR, 6))
        manifest[name] = dict(target_db=spec["target"], measure="mean loudness (loop)" if spec["loop"] else
                              "peak momentary loudness, K-weighted 100 ms", drive_db=spec["drive"], loop=spec["loop"],
                              variants=meta)
        print(f"{name:15} " + "  ".join(f"{m['file']} {m['seconds']:.2f}s pk {m['peak_dbfs']:.1f} L {m['level_db']:.1f}"
                                        for m in meta), flush=True)
    out = {k: out[k] for k in CONTRACT if k in out}
    pub_json.write_text(json.dumps(out, indent=1) + "\n")
    man_path.write_text(json.dumps({k: manifest[k] for k in CONTRACT if k in manifest}, indent=1))


if __name__ == "__main__":
    main()
