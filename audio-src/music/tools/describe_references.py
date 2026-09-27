"""Describe actual reference excerpts with a local audio-language model.

Descriptions are fallible model observations, not human listening approval. This script
does not upload recordings, transcribe melodies or condition the music generator.
Run in .work/audio-listen-venv, under the shared GPU lock and host memory ceiling.
"""
import argparse
import gc
import json
import subprocess
import time
from pathlib import Path

import numpy as np
import torch
from transformers import AutoProcessor, BitsAndBytesConfig, Qwen2AudioForConditionalGeneration

from core import FF, MUSIC

MODEL = 'Qwen/Qwen2-Audio-7B-Instruct'
REVISION = '0a095220c30b7b31434169c3086508ef3ea5bf0a'
PROMPT = (
    'Describe only the music audible in this excerpt. Identify the main instruments or synthesizer timbres, '
    'what the bass and percussion are doing, the rhythm and groove, whether the melody uses short repeated '
    'figures or long phrases, the mood and energy, and any noticeable entrance or change during the excerpt. '
    'Explain what makes it feel driving or calm. Do not guess the artist, title, exact key or exact BPM. '
    'Be specific about sounds you can hear, and acknowledge uncertainty. Answer in one concise paragraph.'
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--families', nargs='*')
    parser.add_argument('--budget', type=float, default=1000)
    args = parser.parse_args()
    start = time.monotonic()
    torch.set_num_threads(4)
    processor = AutoProcessor.from_pretrained(MODEL, revision=REVISION, local_files_only=True)
    quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4',
                              bnb_4bit_compute_dtype=torch.float16,
                              llm_int8_skip_modules=['audio_tower', 'multi_modal_projector'])
    model = Qwen2AudioForConditionalGeneration.from_pretrained(
        MODEL, revision=REVISION, local_files_only=True, device_map={'': 'cuda'},
        quantization_config=quant, torch_dtype=torch.float16,
        low_cpu_mem_usage=True, attn_implementation='sdpa').eval()
    print(f'Audio listener loaded in {time.monotonic() - start:.1f}s', flush=True)
    source = json.loads((MUSIC / 'references/structure.json').read_text())
    dest = MUSIC / 'references/audio-descriptions.json'
    report = json.loads(dest.read_text()) if dest.exists() else dict(
        model=MODEL, revision=REVISION, quantization='NF4 language model, float16 audio encoder',
        prompt=PROMPT, limitation='Model-generated audio descriptions; may misidentify instruments. Check against signal measurements and listening.', excerpts={})
    try:
        for track in source['tracks']:
            if args.families and track['family'] not in args.families:
                continue
            for cue in track['cues']:
                if time.monotonic() - start > args.budget:
                    return
                key = f"{Path(track['file']).name}@{cue['start']}"
                if key in report['excerpts']:
                    continue
                raw = subprocess.check_output([
                    FF, '-v', 'error', '-ss', str(cue['start']), '-i', track['file'],
                    '-t', str(cue['seconds']), '-ar', '16000', '-ac', '1', '-f', 'f32le', 'pipe:1'])
                audio = np.frombuffer(raw, dtype='<f4').copy()
                conversation = [{'role': 'user', 'content': [
                    {'type': 'audio', 'audio_url': track['file']},
                    {'type': 'text', 'text': PROMPT},
                ]}]
                text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
                inputs = processor(text=text, audios=[audio], sampling_rate=16000, return_tensors='pt', padding=True).to('cuda')
                inputs['input_features'] = inputs['input_features'].to(torch.float16)
                with torch.inference_mode():
                    output = model.generate(**inputs, max_new_tokens=220, do_sample=False)
                caption = processor.batch_decode(output[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
                report['excerpts'][key] = dict(file=track['file'], family=track['family'], layer=track['layer'],
                    **cue, description=caption)
                dest.write_text(json.dumps(report, indent=2) + '\n')
                print(key, cue['role'], caption, flush=True)
                del inputs, output
    finally:
        del model
        gc.collect()
        torch.cuda.empty_cache()


if __name__ == '__main__':
    main()
