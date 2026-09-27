"""Calibrate CLAP mood prompts: which dark-vs-happy pair separates the v1 deliveries the user called happy from
deliberately dark references? Prints each pair's mean score per file."""
import sys, subprocess, tempfile
import numpy as np, soundfile as sf, torch
from transformers import ClapModel, ClapProcessor
from core import FF, SR, MUSIC
torch.set_num_threads(16)
model = ClapModel.from_pretrained("laion/clap-htsat-unfused").eval()
proc = ClapProcessor.from_pretrained("laion/clap-htsat-unfused")
PAIRS = {
    "coord": (["dark melancholic ambient synth"], ["happy upbeat cheerful music"]),
    "sad": (["sad music"], ["happy music"]),
    "minor": (["dark sad music in a minor key"], ["bright happy music in a major key"]),
    "ominous": (["ominous tense mysterious music"], ["cheerful joyful playful music"]),
    "lonely": (["lonely melancholic music"], ["optimistic uplifting music"]),
    "mine": (["dark melancholic ambient synthesizer music", "lonely mysterious deep space synth soundtrack",
              "sad slow minor-key music", "cold desolate 1980s sci-fi film synth score"],
             ["happy upbeat cheerful music", "bright uplifting joyful music", "playful feel-good major-key music",
              "heroic triumphant adventure music"]),
}
@torch.no_grad()
def temb(t):
    return torch.nn.functional.normalize(model.get_text_features(**proc(text=t, return_tensors="pt", padding=True)), dim=-1)
T = {k: (temb(a), temb(b)) for k, (a, b) in PAIRS.items()}
S = model.logit_scale_a.exp().item()
def dec(p):
    with tempfile.TemporaryDirectory() as d:
        subprocess.run([FF, "-v", "error", "-i", str(p), "-ac", "1", "-ar", "48000", "-c:a", "pcm_f32le", f"{d}/o.wav"], check=True)
        return sf.read(f"{d}/o.wav", dtype="float32")[0]
@torch.no_grad()
def aemb(m):
    n, h = 10 * SR, 5 * SR
    ch = [m[s:s + n] for s in range(0, max(1, len(m) - n + 1), h)]
    out = []
    for i in range(0, len(ch), 8):
        out.append(torch.nn.functional.normalize(model.get_audio_features(**proc(audio=ch[i:i + 8], sampling_rate=48000, return_tensors="pt")), dim=-1))
    return torch.cat(out)
print(f"{'file':42}" + "".join(f"{k:>9}" for k in PAIRS))
for f in sys.argv[1:]:
    a = aemb(dec(f))
    row = []
    for k, (ta, tb) in T.items():
        v = torch.sigmoid(S * ((a @ ta.T).mean(1) - (a @ tb.T).mean(1))).mean().item()
        row.append(v)
    print(f"{f.split('/')[-1][:42]:42}" + "".join(f"{v:9.2f}" for v in row), flush=True)
