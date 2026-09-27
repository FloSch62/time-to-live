#!/usr/bin/env python3
"""TIME TO LIVE art: submit Krea 2 Turbo candidates to the ComfyUI that serve.sh started (port 8192).

Adapted from faultline/.work/lore/art/gen.py (same conditioning chain): optional reference image(s) +
krea2_style_reference LoRA, TextEncodeQwenImageEditPlus, FluxKontextMultiReferenceLatentMethod(index_timestep_zero),
ModelSamplingFlux, 8 steps euler/simple, cfg 1. Optional init image + mask (SetLatentNoiseMask) for img2img/inpaint.

Candidates land in cand/<group>/<id>/<id>-<version>-<seed>.png with a JSON record (prompt, seed, settings, workflow).
Existing PNGs are skipped.
"""
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ART = Path(__file__).resolve().parent
COMFY_INPUT = ART / "comfy" / "input"
SERVER = "http://127.0.0.1:8192"
COMFY_REV = "b5cc8830279eae909a59de030af1e50761c36751"
MODELS = {
    "diffusionModel": "krea2_turbo_fp8_scaled.safetensors",
    "textEncoder": "qwen3vl_4b_fp8_scaled.safetensors",
    "vae": "qwen_image_vae.safetensors",
    "lora": "krea2_style_reference.safetensors",
}


def request(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(SERVER + path, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode()) from error


def stage_input(path, size=None, mode="RGB"):
    """Copy an image into ComfyUI's input dir (optionally resized); return its input name."""
    from PIL import Image

    path = Path(path)
    if not path.is_absolute():
        path = ART / path
    h = hashlib.sha1(path.read_bytes() + repr((size, mode)).encode()).hexdigest()[:10]
    name = f"ttl-{path.stem}-{h}.png"
    target = COMFY_INPUT / name
    if not target.exists():
        COMFY_INPUT.mkdir(parents=True, exist_ok=True)
        with Image.open(path) as im:
            if im.mode in ("RGBA", "LA", "P") and mode == "RGB":
                im = im.convert("RGBA")
                back = Image.new("RGBA", im.size, (12, 15, 28, 255))
                back.alpha_composite(im)
                im = back
            im = im.convert(mode)
            if size and im.size != tuple(size):
                im = im.resize(tuple(size), Image.NEAREST if im.width * 2 <= size[0] else Image.LANCZOS)
            im.save(target)
    return name


def graph_for(job, ref_names, init_name=None, mask_name=None):
    w, h = job["width"], job["height"]
    g = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": MODELS["diffusionModel"], "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": MODELS["textEncoder"], "type": "krea2", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": MODELS["vae"]}},
        "7": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": "ttl/" + job["id"]}},
    }
    model = ["1", 0]
    if ref_names:
        g["12"] = {"class_type": "LoraLoaderModelOnly", "inputs": {
            "model": ["1", 0], "lora_name": MODELS["lora"], "strength_model": job["strength"]}}
        model = ["12", 0]
        enc = {"clip": ["2", 0], "vae": ["3", 0], "prompt": job["prompt"]}
        for i, name in enumerate(ref_names, start=1):
            node = str(20 + i)
            g[node] = {"class_type": "LoadImage", "inputs": {"image": name}}
            enc[f"image{i}"] = [node, 0]
        g["4"] = {"class_type": "TextEncodeQwenImageEditPlus", "inputs": enc}
        g["13"] = {"class_type": "FluxKontextMultiReferenceLatentMethod", "inputs": {
            "conditioning": ["4", 0], "reference_latents_method": "index_timestep_zero"}}
        positive = ["13", 0]
    else:
        g["4"] = {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": job["prompt"]}}
        positive = ["4", 0]
    if job.get("shift") is not None:
        g["14"] = {"class_type": "ModelSamplingFlux", "inputs": {
            "model": model, "max_shift": job["shift"], "base_shift": job["shift"], "width": w, "height": h}}
        model = ["14", 0]
    g["6"] = {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["4", 0]}}
    latent, denoise = ["7", 0], 1
    if init_name:
        g["30"] = {"class_type": "LoadImage", "inputs": {"image": init_name}}
        g["31"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["30", 0], "vae": ["3", 0]}}
        latent = ["31", 0]
        if mask_name:
            g["32"] = {"class_type": "LoadImageMask", "inputs": {"image": mask_name, "channel": "red"}}
            g["33"] = {"class_type": "SetLatentNoiseMask", "inputs": {"samples": ["31", 0], "mask": ["32", 0]}}
            latent = ["33", 0]
        denoise = job.get("denoise", 0.9)
    g["8"] = {"class_type": "KSampler", "inputs": {
        "model": model, "positive": positive, "negative": ["6", 0], "latent_image": latent,
        "seed": job["seed"], "steps": job.get("steps", 8), "cfg": 1, "sampler_name": "euler",
        "scheduler": "simple", "denoise": denoise}}
    return g


def out_path(job):
    return ART / "cand" / job["group"] / job["id"] / f"{job['id']}-{job['version']}-{job['seed']}.png"


def run_one(job, client):
    out = out_path(job)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        print(f"skip {out.name}", flush=True)
        return None
    ref_names = [stage_input(r["path"], r.get("size")) for r in job.get("refs", [])]
    init_name = mask_name = None
    if job.get("init"):
        init_name = stage_input(job["init"], (job["width"], job["height"]))
        if job.get("mask"):
            mask_name = stage_input(job["mask"], (job["width"], job["height"]))
    g = graph_for(job, ref_names, init_name, mask_name)
    submitted = request("/prompt", {"prompt": g, "client_id": client})
    if submitted.get("node_errors"):
        raise RuntimeError(submitted["node_errors"])
    pid = submitted["prompt_id"]
    t0 = time.monotonic()
    while time.monotonic() - t0 < 900:
        hist = request("/history/" + pid).get(pid)
        if hist:
            if hist["status"]["status_str"] != "success":
                raise RuntimeError(json.dumps(hist["status"]))
            image = hist["outputs"]["10"]["images"][0]
            q = urllib.parse.urlencode({k: image[k] for k in ("filename", "subfolder", "type")})
            with urllib.request.urlopen(SERVER + "/view?" + q, timeout=60) as r:
                out.write_bytes(r.read())
            if mask_name and job.get("keep_outside", True):  # keep the init pixels outside the mask exactly
                from PIL import Image
                with Image.open(out) as gen_im, Image.open(COMFY_INPUT / init_name) as orig, \
                        Image.open(COMFY_INPUT / mask_name) as m:
                    Image.composite(gen_im.convert("RGB"), orig.convert("RGB"), m.convert("L")).save(out)
            secs = round(time.monotonic() - t0, 1)
            record = {k: v for k, v in job.items() if k not in ("notes",)}
            # provenance: snapshot the exact init/mask used next to the candidate (inits are regenerated from code)
            import shutil
            for key, name in (("init", init_name), ("mask", mask_name)):
                if name:
                    snap = out.parent / f"_{key}-{name}"
                    if not snap.exists():
                        shutil.copy(COMFY_INPUT / name, snap)
                    record[key + "_snapshot"] = snap.name
            record.update(steps=job.get("steps", 8), cfg=1, sampler="euler", scheduler="simple", seconds=secs,
                          models=MODELS, comfyui_revision=COMFY_REV, workflow=g)
            out.with_suffix(".json").write_text(json.dumps(record, indent=2) + "\n")
            print(f"ready {out.relative_to(ART)} ({secs} s)", flush=True)
            return secs
        time.sleep(1.0)
    raise TimeoutError(pid)
