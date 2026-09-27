"""Stable Audio 3 Small SFX: render single-event element pools for TIME TO LIVE's layered cues.

Pattern from faultline/.work/sfx/elements.py and .work/lore/score/sfx/gen.py (read-only there):
- one clean event per prompt (composite prompts smear several events together),
- seconds_total >= 3 (shorter windows emit broadband noise bursts), crop afterwards (build.py),
- 8 pingpong steps, cfg 1.0, fp16.

Run under the GPU lock (resumable: takes that already exist are skipped; stops starting new takes after --budget s):
  flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock \
    /home/clab/projects/clab/faultline/.work/sfx/.venv/bin/python audio-src/sfx/gen.py [--budget 900] [element ...]
Takes: audio-src/sfx/el/<element>/p<prompt>-s<seed>.wav (44.1 kHz float), indexed in el/takes.json with prompt/seed."""
from pathlib import Path
import json, sys, time

HERE = Path(__file__).resolve().parent
OUT = HERE / "el"
REPO = "stabilityai/stable-audio-3-small-sfx"
SEEDS = [11, 23, 37, 41, 59, 73, 89, 97]

# element: (kind, seconds, prompts). kind: hit = one transient event, bed = sustained texture (loops, tails).
# The world: a brass-and-ivory relay tender, old copper cable, relay switchboards, glass bells, amber lamps.
ELEMENTS = {
    "elec_crack": ("hit", 3, ["A single short sharp electric discharge crack, one snap of high voltage",
                              "One crisp electric spark snap, short and bright"]),
    "relay_clack": ("hit", 3, ["One small brass electromechanical relay clacks shut, a single dry metallic click",
                               "A single crisp click of an old switchboard relay contact"]),
    "heavy_zap": ("hit", 3, ["One heavy powerful electric discharge, a deep crackling thump of high voltage",
                             "A single massive electric arc blast, short and heavy"]),
    "arc_buzz": ("bed", 4, ["Steady loud electric arc buzzing, a continuous crackling high-voltage beam",
                            "Continuous humming electric plasma beam with a fizzing crackle"]),
    "pneu_launch": ("hit", 3, ["A single pneumatic launcher fires, one heavy thump with a hissing whoosh",
                               "One missile launch from a metal tube, a deep thud and a rushing whoosh"]),
    "cannon": ("hit", 3, ["One short heavy cannon shot, a sharp boom with metallic ring",
                          "A single flak cannon blast, punchy explosive shot"]),
    "metal_clang": ("hit", 3, ["One hard metal impact on a thick steel hull, a single ringing clang",
                               "A single heavy hammer blow on a metal ship hull, short clang"]),
    "metal_heavy": ("hit", 3, ["A massive single impact crashing into a metal hull, deep crunch and rattle",
                               "One huge heavy metal crash, a thick steel plate buckling from a blow"]),
    "explosion": ("hit", 4, ["A single explosion inside a metal room, a punchy blast with rattling debris",
                             "One short powerful explosion in a steel corridor, deep boom"]),
    "explosion_big": ("hit", 5, ["One large powerful explosion with a deep rumble and falling metal debris",
                                 "A huge single blast, deep booming explosion with a long rumbling tail"]),
    "debris": ("bed", 4, ["Small metal parts and bolts falling and rattling on a steel floor",
                          "Metal scraps scattering and clattering on a metal deck"]),
    "powerdown": ("bed", 4, ["A large electrical machine powering down, a slow falling whine fading to silence",
                             "A big generator shutting off, deep hum and whine winding down"]),
    "powerup": ("bed", 3, ["An electric generator powering on, a short rising hum",
                           "A machine powering up, rising electrical whine and hum"]),
    "hum": ("bed", 8, ["Deep steady electric hum of a thick power cable, a constant low thrum",
                       "Constant low humming drone of an electrical transformer, steady and warm"]),
    "fire": ("bed", 10, ["Fire crackling and roaring inside a metal room, steady flames",
                         "Steady burning fire with crackles and a low roar, close"]),
    "air_rush": ("bed", 4, ["Strong air rushing out through a hole in a hull, loud steady hiss of escaping air",
                            "Loud continuous venting of pressurized air, a powerful hiss"]),
    "metal_tear": ("hit", 3, ["A metal hull plate tearing open, a short screeching rip of steel",
                              "One sharp metal tear and creak, steel ripping"]),
    "door_slide": ("hit", 3, ["A sci-fi door slides open with a quick pneumatic hiss",
                              "A metal hatch slides open, short servo whir and air hiss"]),
    "door_thud": ("hit", 3, ["A heavy metal door slides shut with a solid thud",
                             "A hatch closes with a pneumatic hiss and a firm metal clunk"]),
    "ratchet": ("bed", 6, ["A ratchet wrench tightening bolts and light metal tapping, repair work",
                           "Mechanic repairing a machine, wrench clicks and metal taps"]),
    "sparks": ("bed", 4, ["Welding torch sparks crackling, steady electric welding",
                          "Arc welding crackle and sizzle, continuous"]),
    "scuffle": ("hit", 3, ["A short scuffle of two robots, metal clanks and thumps on armor",
                           "Quick metal punches on armor plates, clanking struggle"]),
    "clamp": ("hit", 3, ["A heavy magnetic clamp latches onto a metal hull, one deep clunk",
                         "A docking clamp locks onto steel, heavy metallic latch"]),
    "whoosh": ("hit", 3, ["One fast whoosh of air passing by, a quick swish",
                          "A single swift airy whoosh, something flying past"]),
    "coins": ("hit", 3, ["A few brass tokens dropped into a metal tray, bright clinks",
                         "Small brass coins clinking together, a short jingle"]),
    "scrap": ("hit", 3, ["A handful of small metal scraps dropped into a crate, short clatter",
                         "Metal parts tossed into a metal bin, brief rattle"]),
    "squelch": ("hit", 3, ["A short radio squelch burst as a receiver opens, then silence",
                           "Two-way radio squelch tail, one brief static burst and a click"]),
    "glass_bell": ("hit", 6, ["A single glass bell struck once, a clear ringing tone with a long shimmer",
                              "One crystal bell tone ringing out, pure and slow decay"]),
    "lamp_buzz": ("hit", 3, ["A small indicator lamp relay switches on with one soft click and a faint electrical buzz",
                             "Tiny relay click followed by a faint warm electric hum of a lamp filament"]),
    "switch": ("hit", 3, ["A heavy electrical breaker lever thrown, one solid mechanical clunk",
                          "An old knife switch slammed closed, a single metal clack"]),
    "servo": ("hit", 3, ["A small servo motor whirs briefly, short mechanical movement",
                         "A tiny robot joint moves, short electric whir"]),
    "slam_far": ("hit", 5, ["A distant enormous metal gate slams shut, a deep echoing boom",
                            "Far away a heavy steel door closes with a huge reverberant clang"]),
    "air_brake": ("hit", 3, ["A short air brake hiss release, pneumatic pssh",
                             "Pneumatic valve releases a quick burst of air"]),
    # direction v2 (2026-09-27): the tender is a cable car hanging from a drive trolley on the Line's carrier cables
    "cable_twang": ("hit", 3, ["A taut steel cable struck hard, a single deep metallic twang with a ringing tail",
                               "A thick tensioned wire snaps against a metal frame, one twangy metallic ring"]),
    "wheel_hiss": ("bed", 6, ["Steel wheels rolling fast along a taut steel cable, a whirring metallic hiss",
                              "A cable car trolley racing along a wire rope, rushing whir and hum"]),
    "cable_brake": ("hit", 4, ["A cable car trolley brakes hard on a steel cable, a metallic squeal slowing to a stop",
                               "Metal brake shoes squeal on a moving steel wire rope, then stop with a clunk"]),
    "cable_creak": ("bed", 10, ["A heavy steel cable creaking and groaning slowly under load in the wind",
                                "Slow metallic creaks of a suspended cable car swaying on its cable"]),
    "switchgear": ("hit", 3, ["A massive railway switch lever thrown, one heavy mechanical clunk and a latch",
                              "Huge industrial switchgear contactor slams closed, a deep metallic clunk"]),
    "motor_spool": ("bed", 4, ["An electric tram motor spinning up, a rising electric whine and hum",
                               "A cable car drive motor spooling up, rising whirr"]),
    # modular tender (coordinator addendum): coupling cars, refitting room modules
    "chain": ("hit", 3, ["A heavy iron chain rattles and snaps taut with a clank",
                         "Thick metal chain links clanking and pulling tight"]),
    "latch_release": ("hit", 3, ["A heavy mechanical coupler latch releases with a clank",
                                 "A big steel latch springs open, one metallic clack and rattle"]),
    "impact_wrench": ("hit", 3, ["A pneumatic impact wrench fastens a bolt, one short burst",
                                 "A power ratchet tightening bolts, two quick bursts"]),
}


def main():
    args = sys.argv[1:]
    budget = 900.0
    if "--budget" in args:
        i = args.index("--budget"); budget = float(args[i + 1]); del args[i:i + 2]
    only = set(args)
    t_start = time.time()
    import soundfile as sf
    import torch
    from stable_audio_tools import get_pretrained_model
    from stable_audio_tools.inference.generation import generate_diffusion_cond_inpaint
    model, config = get_pretrained_model(REPO)
    rate, size = int(config["sample_rate"]), int(config["sample_size"])
    model = model.to("cuda").to(torch.float16).eval()
    print(f"loaded sr={rate} in {time.time() - t_start:.0f}s", flush=True)
    index = OUT / "takes.json"
    log = {t["file"]: t for t in (json.loads(index.read_text()) if index.exists() else [])}
    done = 0
    try:
        for name, (kind, seconds, prompts) in ELEMENTS.items():
            if only and name not in only:
                continue
            (OUT / name).mkdir(parents=True, exist_ok=True)
            for p, prompt in enumerate(prompts):
                for seed in SEEDS:
                    path = OUT / name / f"p{p}-s{seed}.wav"
                    rel = str(path.relative_to(HERE))
                    if path.exists():
                        continue
                    if time.time() - t_start > budget:
                        print("budget reached", flush=True)
                        return
                    audio = generate_diffusion_cond_inpaint(
                        model, steps=8, cfg_scale=1.0, sampler_type="pingpong", seed=seed,
                        conditioning=[{"prompt": prompt, "seconds_total": seconds}],
                        sample_size=size, device="cuda", sigma_max=1.0, apg_scale=1.0,
                        duration_padding_sec=6.0)
                    sf.write(path, audio[0].float().cpu()[:, : int(seconds * rate)].numpy().T, rate, subtype="FLOAT")
                    log[rel] = dict(element=name, kind=kind, prompt=prompt, prompt_index=p, seed=seed, seconds=seconds,
                                    file=rel, model=REPO, steps=8, cfg_scale=1.0, sampler="pingpong",
                                    sigma_max=1.0, apg_scale=1.0, dtype="float16")
                    done += 1
            print(f"{name} done ({time.time() - t_start:.0f}s)", flush=True)
    finally:
        index.write_text(json.dumps(sorted(log.values(), key=lambda t: t["file"]), indent=1))
        print(f"rendered {done} takes in {time.time() - t_start:.0f}s", flush=True)
        del model
        torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
