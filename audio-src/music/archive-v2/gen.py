"""YuE2 takes for TIME TO LIVE with classifier-free guidance AWAY from voices (after faultline .work/lore/score/gen2.py).

The CFG negative branch is the same instruction + [Tags] NEGATIVE (plans.py) + the exact same ABC, so only the style
text differs between the branches: logits = neg + cfg * (pos - neg). Block labels are non-vocal (plans.py).

Run under the GPU lock from the project root; resumable (existing takes are skipped) and time-boxed: no new take is
started once the elapsed time plus the estimate for that take would pass --budget seconds (default 1080 = 18 min).
  flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock \
    /home/clab/projects/clab/faultline/.venv-score/bin/python audio-src/music/gen.py [--budget 1080] [--cfg 1.6] JOB ...
JOB = <piece>:<version>:<n>[,<n>...]   (take n uses plans.seed(piece, version, n); n may be a range a-b)
Outputs: takes/<piece>/<version>/t<n>/ audio.flac (48 kHz stereo 24-bit), semantic.npy, latent.npy, score.abc,
request.json, config.json (effective generation config), gen.json (cfg, negative, seed, timing), result.json."""
import gc, hashlib, json, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import plans  # noqa: E402

TOK_PER_S = 25.0


def parse(jobs):
    out = []
    for job in jobs:
        pid, version, ns = job.split(":")
        assert pid in plans.P and version in plans.P[pid]["versions"], job
        for part in ns.split(","):
            if "-" in part:
                a, b = map(int, part.split("-"))
                out += [(pid, version, n) for n in range(a, b + 1)]
            else:
                out.append((pid, version, int(part)))
    return out


def take_dir(pid, version, n):
    return HERE / "takes" / pid / version / f"t{n}"


def planned_seconds(pid):
    L = plans.layout(pid)
    return L["bars"] * L["bar_s"]


def estimate(pid):
    """Wall seconds for one CFG take on the 4080: ~79 tokens/s with two branches, NAR + VAE ~20 s."""
    return planned_seconds(pid) * 1.1 * TOK_PER_S / 75.0 + 25.0


def main():
    args = sys.argv[1:]
    budget, cfg = 1080.0, 1.8
    if "--budget" in args:
        i = args.index("--budget"); budget = float(args[i + 1]); del args[i:i + 2]
    if "--cfg" in args:
        i = args.index("--cfg"); cfg = float(args[i + 1]); del args[i:i + 2]
    todo = [j for j in parse(args) if not (take_dir(*j) / "audio.flac").exists()]
    if not todo:
        print("nothing to do", flush=True)
        return
    t_start = time.time()
    import numpy as np, soundfile as sf, torch
    from yue2 import YuE2Pipeline
    from yue2.pipeline import SemanticResult
    from yue2.protocol import SongRequest, Sampling, INSTRUCTIONS, EOD, ABC_START, ABC_END, MUSIC_START, CODEC_OFFSET
    with YuE2Pipeline.from_pretrained("m-a-p/YuE2-3B", vae="m-a-p/YuE2-Vae", device="cuda",
                                     memory_budget_gib=16, offload_ar=True) as pipe:
        print(f"loaded in {time.time() - t_start:.0f}s", flush=True)
        for pid, version, n in todo:
            elapsed = time.time() - t_start
            if elapsed + estimate(pid) > budget:
                print(json.dumps({"stop": "budget", "elapsed": round(elapsed), "left": len(todo)}), flush=True)
                break
            t0 = time.time()
            seed = plans.seed(pid, version, n)
            abc = plans.score(pid, version)
            request = SongRequest(style=plans.style_text(pid, version), lyrics="", cot="full", abc=abc, seed=seed,
                                  id=f"ttl-{pid}-{version}-t{n}")
            plan = pipe.plan(request=request)
            text = f"{INSTRUCTIONS[request.cot]}\n[Tags]\n{plans.negative(pid)}\n[Lyrics]\n\n"
            neg = [EOD] + pipe.tokenizer.encode(text) + [ABC_START] + list(plan.abc_ids) + [ABC_END, MUSIC_START]
            max_tokens = min(9000, int(planned_seconds(pid) * TOK_PER_S * 1.5) + 250)
            sampling = Sampling(max_tokens=max_tokens)
            ids, timing, truncated = pipe._generate(plan.prefix, sampling, seed, "semantic", negative=neg, cfg_scale=cfg)
            tokens = [int(t) - CODEC_OFFSET for t in ids]
            sem = SemanticResult(plan, tokens, timing, truncated)
            t_nar = time.time()
            latents = pipe.synthesize(sem)
            t_vae = time.time()
            audio = pipe.decode(latents)
            dest = take_dir(pid, version, n)
            dest.mkdir(parents=True, exist_ok=True)
            plan.save(dest)
            sf.write(dest / "audio.flac", audio, 48000, subtype="PCM_24")
            np.save(dest / "semantic.npy", np.asarray(tokens, dtype=np.int32))
            np.save(dest / "latent.npy", np.asarray(latents, dtype=np.float32))
            (dest / "score.abc").write_text(abc)
            (dest / "request.json").write_text(json.dumps(request.to_dict(), indent=2))
            (dest / "config.json").write_text(json.dumps(pipe.effective_config(request, semantic_sampling=sampling),
                                                         indent=2, default=str))
            meta = dict(piece=pid, version=version, take=n, seed=seed, cfg=cfg, negative=plans.negative(pid), plans="v2-dark",
                        style=plans.style_text(pid, version), plan_sha256=hashlib.sha256(abc.encode()).hexdigest(),
                        layout=plans.layout(pid), semantic_tokens=len(tokens), max_tokens=max_tokens,
                        truncated=bool(truncated), timing=timing, nar_seconds=round(t_vae - t_nar, 1),
                        vae_seconds=round(time.time() - t_vae, 1), model="m-a-p/YuE2-3B", vae="m-a-p/YuE2-Vae",
                        package="yue2-infer 0.1.6 (faultline .venv-score)")
            (dest / "gen.json").write_text(json.dumps(meta, indent=2, default=str))
            (dest / "result.json").write_text(json.dumps({"status": "complete", "truncated": bool(truncated),
                                                           "audio_seconds": len(audio) / 48000,
                                                           "planned_seconds": planned_seconds(pid)}, indent=2))
            print(json.dumps({"take": f"{pid}/{version}/t{n}", "seed": seed, "seconds": round(len(audio) / 48000, 1),
                              "planned": round(planned_seconds(pid), 1), "truncated": bool(truncated),
                              "wall": round(time.time() - t0, 1)}), flush=True)
            del sem, latents, audio
            gc.collect(); torch.cuda.empty_cache()
    print(f"hold done in {time.time() - t_start:.0f}s", flush=True)


if __name__ == "__main__":
    main()
