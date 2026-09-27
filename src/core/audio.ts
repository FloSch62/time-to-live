// WebAudio music + sound effects. Music themes may have explore/battle layers played in sync and crossfaded
// (FTL-style). Everything fails silently when a file is missing so the game runs before audio is delivered.
import { loadJson, url } from "./assets";

interface MusicMeta {
  files: Partial<Record<MusicLayer | "main", string>>;
  loop?: boolean;
  bpm?: number;
  bars?: number;
  duration?: number;
  loopStart?: number;
  loopEnd?: number;
  gainDb?: number;
}
interface SfxMeta {
  files: string[];
  gain?: number; // dB
  loop?: boolean;
  loopStart?: number;
  loopEnd?: number;
}

export type MusicLayer = "explore" | "battle" | "custody" | "emergency" | "horizon";

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  volumes = { master: 0.8, music: 0.7, sfx: 0.8 };
  private musicMeta: Record<string, MusicMeta> = {};
  private sfxMeta: Record<string, SfxMeta> = {};
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private ready = false;

  async init() {
    const [m, s] = await Promise.all([
      loadJson<Record<string, MusicMeta>>("audio/music.json"),
      loadJson<Record<string, SfxMeta>>("audio/sfx.json"),
    ]);
    this.musicMeta = m ?? {};
    this.sfxMeta = s ?? {};
  }

  /** Create/resume the context. Call on the first user gesture. */
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext({ latencyHint: "interactive" });
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      this.ready = true;
      music.onUnlock();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.volumes.music, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.02);
  }

  get isReady() {
    return this.ready && !!this.ctx;
  }

  buffer(path: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(path);
    if (p) {
      this.buffers.delete(path);
      this.buffers.set(path, p);
      return p;
    }
    // Music is large (~60 MB per take). Effects have their own small-file budget so a volley does not
    // evict the score and force it to decode again at the next relay.
    const isMusic = path.startsWith("audio/music/");
    const peers = [...this.buffers.keys()].filter((key) => key.startsWith("audio/music/") === isMusic);
    const limit = isMusic ? 6 : 96;
    while (peers.length >= limit) this.buffers.delete(peers.shift()!);
    p = (async () => {
      if (!this.ctx) return null;
      try {
        const r = await fetch(url(path));
        if (!r.ok) return null;
        const data = await r.arrayBuffer();
        return await this.ctx.decodeAudioData(data);
      } catch {
        return null;
      }
    })();
    this.buffers.set(path, p);
    return p;
  }

  music(id: string): MusicMeta | undefined {
    return this.musicMeta[id];
  }
  sfxInfo(id: string): SfxMeta | undefined {
    return this.sfxMeta[id];
  }
}

export const audio = new AudioEngine();

const dbToGain = (db = 0) => Math.pow(10, db / 20);

// ─── Music ─────────────────────────────────────────────────────────────────────────────────────────────────

interface Playing {
  id: string;
  sources: AudioBufferSourceNode[];
  layerGains: Record<string, GainNode>;
  out: GainNode;
}

class Music {
  private current: Playing | null = null;
  private wanted: { id: string; layer: MusicLayer } | null = null;
  layer: MusicLayer = "explore";
  private token = 0;

  get currentId() {
    return this.wanted?.id ?? null;
  }

  onUnlock() {
    if (this.wanted) {
      const w = this.wanted;
      this.wanted = null;
      void this.play(w.id, w.layer);
    }
  }

  /** Play a theme (crossfades from the current one). Same id → only switches the layer. */
  async play(id: string, layer: MusicLayer = this.layer, fade = 1.6) {
    if (this.wanted?.id === id && this.current?.id === id) {
      this.setLayer(layer);
      return;
    }
    this.wanted = { id, layer };
    this.layer = layer;
    if (!audio.isReady) return;
    const ctx = audio.ctx!;
    const meta = audio.music(id);
    const my = ++this.token;
    this.fadeOut(fade);
    if (!meta) return;
    const files = meta.files;
    const paths: Record<string, string> = {};
    if (files.main && !files.custody) paths.main = files.main;
    for (const phase of ["custody", "emergency", "horizon"] as const) {
      if (files[phase]) paths[phase] = files[phase];
    }
    if (files.explore) paths.explore = files.explore;
    if (files.battle) paths.battle = files.battle;
    const entries = Object.entries(paths);
    const bufs = await Promise.all(entries.map(([, p]) => audio.buffer(p.startsWith("audio/") ? p : `audio/music/${p}`)));
    if (my !== this.token) return; // superseded while loading
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(audio.musicBus);
    // Delivery gain is already baked into the mastered files.
    const base = 1;
    const start = ctx.currentTime + 0.05;
    const sources: AudioBufferSourceNode[] = [];
    const layerGains: Record<string, GainNode> = {};
    let ended = 0;
    entries.forEach(([name], i) => {
      const buf = bufs[i];
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = meta.loop !== false;
      if (meta.loopEnd && meta.loopEnd > (meta.loopStart ?? 0)) {
        src.loopStart = meta.loopStart ?? 0;
        src.loopEnd = Math.min(meta.loopEnd, buf.duration);
      }
      const gn = ctx.createGain();
      gn.gain.value = name === "main" || name === this.layer || (name === "explore" && !paths.battle) ? 1 : 0;
      src.connect(gn).connect(out);
      src.onended = () => {
        src.disconnect();
        gn.disconnect();
        if (++ended === sources.length) out.disconnect();
      };
      src.start(start);
      sources.push(src);
      layerGains[name] = gn;
    });
    out.gain.setValueAtTime(0, start);
    out.gain.linearRampToValueAtTime(base, start + fade);
    this.current = { id, sources, layerGains, out };
  }

  /** Crossfade between explore and battle layers of the current theme. */
  setLayer(layer: MusicLayer, fade = 1.5) {
    this.layer = layer;
    if (this.wanted) this.wanted.layer = layer;
    const cur = this.current;
    if (!cur || !audio.ctx) return;
    const t = audio.ctx.currentTime;
    const selected = cur.layerGains[layer] ? layer : cur.layerGains.custody ? "custody" : "explore";
    const entries = Object.entries(cur.layerGains);
    const starts = entries.map(([, gain]) => gain.gain.value);
    const targets = entries.map(([name]) => name === "main" || name === selected ? 1 : 0);
    const curves = entries.map(() => new Float32Array(33));
    for (let i = 0; i < 33; i++) {
      const progress = i / 32;
      const values = starts.map((start, j) => start * (1 - progress) + targets[j] * progress);
      const length = Math.hypot(...values) || 1;
      values.forEach((value, j) => { curves[j][i] = value / length; });
    }
    entries.forEach(([, gain], i) => {
      gain.gain.cancelAndHoldAtTime(t);
      if (fade <= 0) gain.gain.setValueAtTime(targets[i], t);
      else gain.gain.setValueCurveAtTime(curves[i], t, fade);
    });
  }

  stop(fade = 1.6) {
    this.wanted = null;
    this.token++;
    this.fadeOut(fade);
  }

  private fadeOut(fade: number) {
    const cur = this.current;
    this.current = null;
    if (!cur || !audio.ctx) return;
    const t = audio.ctx.currentTime;
    cur.out.gain.cancelScheduledValues(t);
    cur.out.gain.setValueAtTime(cur.out.gain.value, t);
    cur.out.gain.linearRampToValueAtTime(0, t + fade);
    for (const s of cur.sources) {
      try {
        s.stop(t + fade + 0.05);
      } catch {
        /* already stopped */
      }
    }
  }
}

export const music = new Music();

// ─── Sound effects ─────────────────────────────────────────────────────────────────────────────────────────

export interface SfxOpts {
  volume?: number; // linear multiplier
  pan?: number; // -1..1
  rate?: number;
  /** Minimum seconds between plays of the same id (avoid machine-gun stacking). */
  throttle?: number;
}

export interface LoopHandle {
  stop(fade?: number): void;
  setVolume(v: number): void;
}

class Sfx {
  private last = new Map<string, number>();

  play(id: string, opts: SfxOpts = {}) {
    if (!audio.isReady) return;
    const meta = audio.sfxInfo(id);
    if (!meta || meta.files.length === 0) return;
    const ctx = audio.ctx!;
    const now = ctx.currentTime;
    const throttle = opts.throttle ?? 0.03;
    if (now - (this.last.get(id) ?? -1) < throttle) return;
    this.last.set(id, now);
    const file = meta.files[Math.floor(Math.random() * meta.files.length)];
    void audio.buffer(file.startsWith("audio/") ? file : `audio/sfx/${file}`).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      const gain = ctx.createGain();
      gain.gain.value = dbToGain(meta.gain) * (opts.volume ?? 1);
      let node: AudioNode = src.connect(gain);
      if (opts.pan) {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, opts.pan));
        node = node.connect(p);
      }
      node.connect(audio.sfxBus);
      src.onended = () => {
        src.disconnect();
        gain.disconnect();
        if (node !== gain) node.disconnect();
      };
      src.start();
    });
  }

  /** Start a looping effect; returns a handle (no-op handle when unavailable). */
  loop(id: string, opts: SfxOpts = {}): LoopHandle {
    const noop: LoopHandle = { stop() {}, setVolume() {} };
    if (!audio.isReady) return noop;
    const meta = audio.sfxInfo(id);
    if (!meta || meta.files.length === 0) return noop;
    const ctx = audio.ctx!;
    const gain = ctx.createGain();
    const base = dbToGain(meta.gain);
    gain.gain.value = 0;
    gain.connect(audio.sfxBus);
    let src: AudioBufferSourceNode | null = null;
    let stopped = false;
    void audio.buffer(meta.files[0].startsWith("audio/") ? meta.files[0] : `audio/sfx/${meta.files[0]}`).then((buf) => {
      if (!buf || stopped) { gain.disconnect(); return; }
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = Math.max(0, Math.min(meta.loopStart ?? 0, buf.duration));
      src.loopEnd = Math.max(src.loopStart, Math.min(meta.loopEnd ?? buf.duration, buf.duration));
      src.playbackRate.value = opts.rate ?? 1;
      src.connect(gain);
      src.onended = () => { src?.disconnect(); gain.disconnect(); };
      src.start();
      gain.gain.setTargetAtTime(base * (opts.volume ?? 1), ctx.currentTime, 0.08);
    });
    return {
      stop(fade = 0.2) {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0, t, Math.max(0.001, fade / 3));
        if (src) src.stop(t + fade + 0.1);
        else gain.disconnect();
      },
      setVolume(v: number) {
        gain.gain.setTargetAtTime(base * v, ctx.currentTime, 0.05);
      },
    };
  }
}

export const sfx = new Sfx();
