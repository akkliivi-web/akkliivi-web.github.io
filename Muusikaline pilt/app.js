const imageInput = document.getElementById("imageInput");
const multiImageInput = document.getElementById("multiImageInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const cameraBtn = document.getElementById("cameraBtn");
const previewBtn = document.getElementById("previewBtn");
const midiBtn = document.getElementById("midiBtn");
const shareBtn = document.getElementById("shareBtn");
const stylePreset = document.getElementById("stylePreset");
const coPrompt = document.getElementById("coPrompt");
const imagePreview = document.getElementById("imagePreview");
const cameraPreview = document.getElementById("cameraPreview");
const beatCanvas = document.getElementById("beatCanvas");
const placeholder = document.getElementById("placeholder");
const palette = document.getElementById("palette");
const objectList = document.getElementById("objectList");
const musicInfo = document.getElementById("musicInfo");
const emotionInfo = document.getElementById("emotionInfo");
const objectInstrumentInfo = document.getElementById("objectInstrumentInfo");
const timelineInfo = document.getElementById("timelineInfo");
const shareOutput = document.getElementById("shareOutput");
const statusLine = document.getElementById("status");

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STYLE_PRESETS = {
  cinematic: { tempoBias: 0, melodyDensity: 0.45, instrumentBias: "pad", swing: 0 },
  lofi: { tempoBias: -18, melodyDensity: 0.35, instrumentBias: "soft", swing: 0.08 },
  edm: { tempoBias: 24, melodyDensity: 0.65, instrumentBias: "bright", swing: 0 },
  ambient: { tempoBias: -26, melodyDensity: 0.22, instrumentBias: "air", swing: 0.1 },
  jazz: { tempoBias: -6, melodyDensity: 0.52, instrumentBias: "warm", swing: 0.16 },
};

const state = {
  model: null,
  imageReady: false,
  analyzed: false,
  cameraMode: false,
  cameraStream: null,
  cameraTimer: null,
  dominantColors: [],
  objects: [],
  musicProfile: null,
  emotion: null,
  objectInstruments: [],
  timeline: [],
  randomSeedBump: 0,
  sourceImages: [],
  sourceNames: [],
};

const engine = {
  initialized: false,
  synth: null,
  padSynth: null,
  softSynth: null,
  bassSynth: null,
  kick: null,
  hat: null,
  snare: null,
  melodySeq: null,
  bassSeq: null,
  drumSeq: null,
  padLoop: null,
  sectionPart: null,
  objectPlayers: new Map(),
};

imageInput.addEventListener("change", (event) => onSingleFileSelected(event));
multiImageInput.addEventListener("change", (event) => onMultiFilesSelected(event));
analyzeBtn.addEventListener("click", analyzeCurrentImageSet);
playBtn.addEventListener("click", playTrack);
stopBtn.addEventListener("click", stopTrack);
regenerateBtn.addEventListener("click", regenerateTrack);
cameraBtn.addEventListener("click", toggleCameraMode);
previewBtn.addEventListener("click", playShortPreview);
midiBtn.addEventListener("click", exportMidi);
shareBtn.addEventListener("click", generateShareLink);

window.addEventListener("beforeunload", () => {
  stopCameraMode();
  stopTrack();
});

hydrateFromShareHash();

async function onSingleFileSelected(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  stopCameraMode();
  state.sourceImages = [await imageFileToLoadedImage(file)];
  state.sourceNames = [file.name || "single-image"];
  composeMashupPreview(state.sourceImages);
  activateImageMode();
}

async function onMultiFilesSelected(event) {
  const files = [...(event.target.files || [])].slice(0, 4);
  if (!files.length) {
    return;
  }

  stopCameraMode();
  setStatus("Laen mitu pilti mashupiks...");
  state.sourceImages = await Promise.all(files.map((file) => imageFileToLoadedImage(file)));
  state.sourceNames = files.map((file) => file.name || "image");
  composeMashupPreview(state.sourceImages);
  activateImageMode();
}

function activateImageMode() {
  state.imageReady = true;
  state.analyzed = false;
  state.randomSeedBump = 0;

  cameraPreview.style.display = "none";
  imagePreview.style.display = "block";
  beatCanvas.style.display = "block";
  placeholder.style.display = "none";

  clearAnalysisOutput();
  setStatus("Pilt on valmis. Vajuta Analüüsi.");
  analyzeBtn.disabled = false;
  playBtn.disabled = true;
  stopBtn.disabled = true;
  regenerateBtn.disabled = true;
  previewBtn.disabled = true;
  midiBtn.disabled = true;
  shareBtn.disabled = true;
}

async function imageFileToLoadedImage(file) {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.src = objectUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  return img;
}

function composeMashupPreview(images) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const cellCount = images.length;
  const cols = cellCount <= 2 ? cellCount : 2;
  const rows = Math.ceil(cellCount / 2);
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  images.forEach((img, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellW;
    const y = row * cellH;
    drawCoverImage(ctx, img, x, y, cellW, cellH);
  });

  imagePreview.src = canvas.toDataURL("image/jpeg", 0.94);
}

async function analyzeCurrentImageSet() {
  if (!state.imageReady) {
    return;
  }

  try {
    analyzeBtn.disabled = true;
    setStatus("Laen objektimudelit...");
    await ensureModel();

    const detectionSource = state.cameraMode ? cameraPreview : imagePreview;

    setStatus("Analüüsin värve, objekte ja emotsiooni...");
    const colors = extractDominantColors(detectionSource, 6);
    const detections = await state.model.detect(detectionSource, 12);

    state.dominantColors = colors;
    state.objects = summarizeObjects(detections);
    state.emotion = detectEmotion(colors, state.objects);
    state.objectInstruments = mapObjectInstruments(state.objects);
    state.musicProfile = buildMusicProfile({
      colors,
      objects: state.objects,
      seedBump: state.randomSeedBump,
      presetName: stylePreset.value,
      emotion: state.emotion,
      coText: coPrompt.value.trim(),
      sourceCount: Math.max(1, state.sourceImages.length),
    });
    state.timeline = buildTimelineSections(state.musicProfile, state.dominantColors);
    state.analyzed = true;

    renderPalette(colors);
    renderObjects(state.objects);
    renderMusicInfo(state.musicProfile);
    renderEmotion(state.emotion);
    renderObjectInstruments(state.objectInstruments);
    renderTimeline(state.timeline);
    drawBeatMap(state.musicProfile, state.dominantColors, state.objects);

    setStatus("Analüüs valmis. Vajuta Mängi, et kuulata pala.");

    playBtn.disabled = false;
    stopBtn.disabled = false;
    regenerateBtn.disabled = false;
    previewBtn.disabled = false;
    midiBtn.disabled = false;
    shareBtn.disabled = false;
  } catch (error) {
    console.error(error);
    setStatus("Analüüs ebaõnnestus. Proovi teise pildiga.");
  } finally {
    analyzeBtn.disabled = false;
  }
}

async function ensureModel() {
  if (state.model) {
    return;
  }
  state.model = await cocoSsd.load({ base: "mobilenet_v2" });
}

async function toggleCameraMode() {
  if (state.cameraMode) {
    stopCameraMode();
    setStatus("Kaamera peatatud. Võid laadida foto.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });

    state.cameraMode = true;
    state.cameraStream = stream;
    cameraPreview.srcObject = stream;
    cameraPreview.style.display = "block";
    imagePreview.style.display = "none";
    beatCanvas.style.display = "block";
    placeholder.style.display = "none";

    analyzeBtn.disabled = false;
    setStatus("Kaamera režiim aktiivne. Autoanalüüs iga 8s.");

    state.cameraTimer = setInterval(() => {
      if (state.cameraMode) {
        analyzeCurrentImageSet();
      }
    }, 8000);
  } catch (error) {
    console.error(error);
    setStatus("Kaamera avamine ebaõnnestus.");
  }
}

function stopCameraMode() {
  if (!state.cameraMode) {
    return;
  }

  state.cameraMode = false;
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }
  if (state.cameraTimer) {
    clearInterval(state.cameraTimer);
    state.cameraTimer = null;
  }

  cameraPreview.style.display = "none";
}

function extractDominantColors(sourceElement, count) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const sourceWidth = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width;
  const sourceHeight = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height;

  const width = 220;
  const height = Math.max(1, Math.round((sourceHeight / sourceWidth) * width));
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(sourceElement, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const buckets = new Map();

  for (let i = 0; i < data.length; i += 12) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 8) {
      continue;
    }

    const rq = Math.round(r / 32) * 32;
    const gq = Math.round(g / 32) * 32;
    const bq = Math.round(b / 32) * 32;
    const key = `${rq}-${gq}-${bq}`;

    if (!buckets.has(key)) {
      buckets.set(key, { r: 0, g: 0, b: 0, n: 0 });
    }

    const bucket = buckets.get(key);
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
  }

  const dominant = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((bucket) => {
      const r = Math.round(bucket.r / bucket.n);
      const g = Math.round(bucket.g / bucket.n);
      const b = Math.round(bucket.b / bucket.n);
      const hsl = rgbToHsl(r, g, b);
      return {
        r,
        g,
        b,
        hex: rgbToHex(r, g, b),
        brightness: (r + g + b) / (3 * 255),
        saturation: hsl.s,
        hue: hsl.h,
      };
    });

  if (!dominant.length) {
    return [
      {
        r: 120,
        g: 120,
        b: 120,
        hex: "#787878",
        brightness: 0.47,
        saturation: 0,
        hue: 0,
      },
    ];
  }

  return dominant;
}

function summarizeObjects(detections) {
  if (!detections.length) {
    return [{ name: "No dominant object", score: 0 }];
  }

  const map = new Map();
  for (const item of detections) {
    const key = item.class;
    const score = Number(item.score.toFixed(2));
    if (!map.has(key) || map.get(key) < score) {
      map.set(key, score);
    }
  }

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, score]) => ({ name, score }));
}

function detectEmotion(colors, objects) {
  const avgBrightness = average(colors.map((c) => c.brightness));
  const avgSat = average(colors.map((c) => c.saturation));
  const objectCount = objects.filter((item) => item.score > 0).length;

  let label = "calm";
  if (avgBrightness < 0.38) {
    label = "dark";
  } else if (avgBrightness > 0.72 && avgSat > 0.45) {
    label = "happy";
  } else if (avgSat > 0.62 || objectCount > 5) {
    label = "energetic";
  }

  const moodMap = {
    calm: { valence: 0.6, arousal: 0.35, description: "Rahulik ja pehme" },
    dark: { valence: 0.25, arousal: 0.3, description: "Sügav ja tumedam" },
    happy: { valence: 0.85, arousal: 0.68, description: "Helge ja rõõmus" },
    energetic: { valence: 0.7, arousal: 0.88, description: "Liikuv ja energiline" },
  };

  return { label, ...moodMap[label] };
}

function mapObjectInstruments(objects) {
  const mapping = {
    person: "lead synth",
    car: "growl bass",
    bus: "brass stabs",
    train: "pulse arp",
    cat: "pluck",
    dog: "marimba",
    bird: "flute",
    chair: "keys",
    laptop: "digital keys",
    phone: "bell",
    bottle: "percussion fx",
    tv: "retro lead",
  };

  return objects.map((item) => ({
    name: item.name,
    instrument: mapping[item.name] || "texture pad",
    confidence: item.score,
  }));
}

function buildMusicProfile({ colors, objects, seedBump, presetName, emotion, coText, sourceCount }) {
  const avgBrightness = average(colors.map((c) => c.brightness));
  const avgSaturation = average(colors.map((c) => c.saturation));
  const hueAverage = average(colors.map((c) => c.hue));
  const contrast =
    Math.max(...colors.map((c) => c.brightness)) - Math.min(...colors.map((c) => c.brightness));

  const preset = STYLE_PRESETS[presetName] || STYLE_PRESETS.cinematic;
  const rootIndex = Math.floor((hueAverage / 360) * 12) % 12;
  const isMajor = avgSaturation + emotion.valence * 0.1 > 0.45;
  const scaleIntervals = isMajor ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];

  const coInfluence = parseTextInfluence(coText);

  const tempo = clamp(
    Math.round(68 + avgBrightness * 64 + objects.length * 3 + preset.tempoBias + coInfluence.tempoShift),
    58,
    180
  );

  const seed =
    (objects.map((obj) => hashString(obj.name)).reduce((acc, value) => acc + value, 0) +
      Math.round(avgBrightness * 1000) +
      seedBump * 1013 +
      sourceCount * 433 +
      hashString(presetName) +
      hashString(coText || "none")) >>>
    0;
  const random = mulberry32(seed);

  const melody = [];
  for (let i = 0; i < 32; i += 1) {
    const playChance = clamp(preset.melodyDensity + avgSaturation * 0.25 + coInfluence.noteDensity, 0.15, 0.92);
    if (random() < playChance) {
      const interval = scaleIntervals[Math.floor(random() * scaleIntervals.length)];
      const octaveBias = coInfluence.octaveLift;
      const octave = random() > 0.52 ? 5 + octaveBias : 4 + octaveBias;
      melody.push(midiToNote(12 * octave + rootIndex + interval));
    } else {
      melody.push(null);
    }
  }

  const bass = [];
  for (let i = 0; i < 16; i += 1) {
    const interval = i % 4 === 0 ? 0 : scaleIntervals[(i + Math.floor(random() * 2)) % scaleIntervals.length];
    bass.push(midiToNote(12 * 2 + rootIndex + interval));
  }

  const drums = [];
  for (let i = 0; i < 32; i += 1) {
    const kick = i % 8 === 0 || (contrast > 0.25 && i % 16 === 14);
    const hat = i % 2 === 0 || random() > 0.78;
    const snare = i % 8 === 4;
    drums.push({ kick, hat, snare });
  }

  const padChords = [
    [0, 4, 7],
    [0, 5, 9],
    [0, 3, 7],
    [0, 2, 7],
  ].map((shape) => shape.map((step) => midiToNote(12 * 4 + rootIndex + step)));

  return {
    tempo,
    key: `${NOTE_NAMES[rootIndex]} ${isMajor ? "major pentatonic" : "minor pentatonic"}`,
    energy: clamp(
      Math.round((avgSaturation * 0.45 + contrast * 0.25 + emotion.arousal * 0.3 + coInfluence.energyBoost) * 100),
      0,
      100
    ),
    presetName,
    swing: preset.swing,
    instrumentBias: preset.instrumentBias,
    coText,
    melody,
    bass,
    drums,
    padChords,
  };
}

function buildTimelineSections(profile, colors) {
  const darkBias = average(colors.map((c) => 1 - c.brightness));
  const base = profile.tempo;
  const introTempo = clamp(Math.round(base * (0.86 + darkBias * 0.08)), 52, 178);
  const dropTempo = clamp(Math.round(base * (1.02 + profile.energy / 500)), 52, 186);
  const outroTempo = clamp(Math.round(base * 0.92), 52, 178);

  return [
    { name: "Intro", bars: 4, tempo: introTempo, density: 0.35 },
    { name: "Verse", bars: 8, tempo: base, density: 0.55 },
    { name: "Drop", bars: 8, tempo: dropTempo, density: 0.82 },
    { name: "Outro", bars: 4, tempo: outroTempo, density: 0.42 },
  ];
}

function renderPalette(colors) {
  palette.innerHTML = "";

  colors.forEach((color) => {
    const item = document.createElement("div");
    item.className = "swatch";
    item.style.backgroundColor = color.hex;

    const label = document.createElement("span");
    label.textContent = color.hex;

    item.appendChild(label);
    palette.appendChild(item);
  });
}

function renderObjects(objects) {
  objectList.innerHTML = "";

  objects.forEach((obj) => {
    const li = document.createElement("li");
    if (obj.score > 0) {
      li.textContent = `${obj.name} (${Math.round(obj.score * 100)}%)`;
    } else {
      li.textContent = obj.name;
    }
    objectList.appendChild(li);
  });
}

function renderMusicInfo(profile) {
  musicInfo.innerHTML = "";

  const rows = [
    `Tempo: ${profile.tempo} BPM`,
    `Helistik: ${profile.key}`,
    `Energia: ${profile.energy}%`,
    `Preset: ${profile.presetName}`,
    `AI tekst: ${profile.coText || "puudub"}`,
  ];

  rows.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    musicInfo.appendChild(li);
  });
}

function renderEmotion(emotion) {
  emotionInfo.innerHTML = "";
  [
    `Meeleolu: ${emotion.label}`,
    `Kirjeldus: ${emotion.description}`,
    `Valence: ${emotion.valence.toFixed(2)}`,
    `Arousal: ${emotion.arousal.toFixed(2)}`,
  ].forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    emotionInfo.appendChild(li);
  });
}

function renderObjectInstruments(mappings) {
  objectInstrumentInfo.innerHTML = "";

  mappings.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} -> ${item.instrument}`;
    objectInstrumentInfo.appendChild(li);
  });
}

function renderTimeline(sections) {
  timelineInfo.innerHTML = "";

  sections.forEach((part) => {
    const li = document.createElement("li");
    li.textContent = `${part.name}: ${part.bars} takti, ${part.tempo} BPM`;
    timelineInfo.appendChild(li);
  });
}

function drawBeatMap(profile, colors, objects) {
  const rect = beatCanvas.parentElement.getBoundingClientRect();
  beatCanvas.width = Math.floor(rect.width);
  beatCanvas.height = Math.floor(rect.height);
  const ctx = beatCanvas.getContext("2d");

  ctx.clearRect(0, 0, beatCanvas.width, beatCanvas.height);
  ctx.globalAlpha = 0.2;

  const pulseCount = 10;
  const energy = profile.energy / 100;

  for (let i = 0; i < pulseCount; i += 1) {
    const color = colors[i % colors.length];
    const x = ((i + 1) / (pulseCount + 1)) * beatCanvas.width;
    const y = (0.22 + ((i % 3) * 0.24)) * beatCanvas.height;
    const radius = 18 + energy * 42 + ((objects.length % 4) * 4);

    ctx.fillStyle = color.hex;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

async function playTrack() {
  if (!state.analyzed || !state.musicProfile) {
    return;
  }

  await Tone.start();
  initializeEngine();
  buildAndStartSequences(state.musicProfile, state.timeline);
  setStatus("Pala mängib. Vajuta Peata, kui soovid katkestada.");
}

async function playShortPreview() {
  if (!state.analyzed || !state.musicProfile) {
    return;
  }

  await playTrack();
  setStatus("Mängib 8-sekundiline eelkuulamine...");
  setTimeout(() => {
    stopTrack();
    setStatus("Eelkuulamine lõppes.");
  }, 8000);
}

function stopTrack() {
  Tone.Transport.stop();
  Tone.Transport.position = 0;
}

function regenerateTrack() {
  if (!state.analyzed) {
    return;
  }

  state.randomSeedBump += 1;
  state.musicProfile = buildMusicProfile({
    colors: state.dominantColors,
    objects: state.objects,
    seedBump: state.randomSeedBump,
    presetName: stylePreset.value,
    emotion: state.emotion,
    coText: coPrompt.value.trim(),
    sourceCount: Math.max(1, state.sourceImages.length),
  });
  state.timeline = buildTimelineSections(state.musicProfile, state.dominantColors);

  renderMusicInfo(state.musicProfile);
  renderTimeline(state.timeline);
  drawBeatMap(state.musicProfile, state.dominantColors, state.objects);
  setStatus("Loodi uus variatsioon. Vajuta Mängi.");
}

function initializeEngine() {
  if (engine.initialized) {
    return;
  }

  engine.synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.18, sustain: 0.34, release: 0.8 },
  }).toDestination();

  engine.padSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.8, decay: 0.4, sustain: 0.5, release: 2.2 },
  }).toDestination();

  engine.softSynth = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2,
    modulationIndex: 2,
    envelope: { attack: 0.03, decay: 0.2, sustain: 0.3, release: 0.6 },
  }).toDestination();

  engine.bassSynth = new Tone.MonoSynth({
    oscillator: { type: "fatsquare" },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 1.2 },
  }).toDestination();

  engine.kick = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 6 }).toDestination();
  engine.hat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
  }).toDestination();
  engine.snare = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
  }).toDestination();

  engine.initialized = true;
}

function ensureObjectPlayer(instrumentName) {
  if (engine.objectPlayers.has(instrumentName)) {
    return engine.objectPlayers.get(instrumentName);
  }

  let synth;
  if (instrumentName.includes("bass")) {
    synth = new Tone.MonoSynth({ oscillator: { type: "square" } }).toDestination();
  } else if (instrumentName.includes("flute")) {
    synth = new Tone.Synth({ oscillator: { type: "sine" } }).toDestination();
  } else if (instrumentName.includes("marimba") || instrumentName.includes("pluck")) {
    synth = new Tone.PluckSynth().toDestination();
  } else {
    synth = new Tone.Synth({ oscillator: { type: "triangle" } }).toDestination();
  }

  engine.objectPlayers.set(instrumentName, synth);
  return synth;
}

function disposeSequences() {
  if (engine.melodySeq) {
    engine.melodySeq.dispose();
    engine.melodySeq = null;
  }
  if (engine.bassSeq) {
    engine.bassSeq.dispose();
    engine.bassSeq = null;
  }
  if (engine.drumSeq) {
    engine.drumSeq.dispose();
    engine.drumSeq = null;
  }
  if (engine.padLoop) {
    engine.padLoop.dispose();
    engine.padLoop = null;
  }
  if (engine.sectionPart) {
    engine.sectionPart.dispose();
    engine.sectionPart = null;
  }
}

function buildAndStartSequences(profile, timeline) {
  disposeSequences();

  Tone.Transport.stop();
  Tone.Transport.position = 0;
  Tone.Transport.bpm.value = profile.tempo;
  Tone.Transport.swing = profile.swing;

  engine.melodySeq = new Tone.Sequence(
    (time, note) => {
      if (!note) {
        return;
      }
      const lead = profile.instrumentBias === "soft" ? engine.softSynth : engine.synth;
      lead.triggerAttackRelease(note, "8n", time, 0.68);
    },
    profile.melody,
    "8n"
  );

  engine.bassSeq = new Tone.Sequence(
    (time, note) => {
      engine.bassSynth.triggerAttackRelease(note, "8n", time, 0.9);
    },
    profile.bass,
    "4n"
  );

  engine.drumSeq = new Tone.Sequence(
    (time, hit) => {
      if (hit.kick) {
        engine.kick.triggerAttackRelease("C1", "8n", time, 0.95);
      }
      if (hit.snare) {
        engine.snare.triggerAttackRelease("8n", time, 0.45);
      }
      if (hit.hat) {
        engine.hat.triggerAttackRelease("16n", time, 0.22);
      }
    },
    profile.drums,
    "16n"
  );

  engine.padLoop = new Tone.Loop((time) => {
    const chord = profile.padChords[Math.floor((Tone.Transport.ticks / Tone.Time("2m").toTicks()) % profile.padChords.length)];
    engine.padSynth.triggerAttackRelease(chord, "2m", time, 0.28);
  }, "2m");

  const sectionEvents = [];
  let cursorBars = 0;
  timeline.forEach((part) => {
    sectionEvents.push({ time: `${cursorBars}m`, data: part });
    cursorBars += part.bars;
  });

  engine.sectionPart = new Tone.Part((time, event) => {
    Tone.Transport.bpm.rampTo(event.data.tempo, 0.5);
  }, sectionEvents);

  scheduleObjectInstruments(profile.key);

  engine.melodySeq.start(0);
  engine.bassSeq.start(0);
  engine.drumSeq.start(0);
  engine.padLoop.start(0);
  engine.sectionPart.start(0);

  Tone.Transport.start();
}

function scheduleObjectInstruments(keyName) {
  const rootName = keyName.split(" ")[0];
  state.objectInstruments.slice(0, 4).forEach((item, idx) => {
    const player = ensureObjectPlayer(item.instrument);
    const pattern = [
      `${rootName}4`,
      `${rootName}5`,
      `${rootName}4`,
      `${rootName}3`,
    ];

    const loop = new Tone.Sequence(
      (time, note) => {
        if (Math.random() < 0.45 + item.confidence * 0.25) {
          player.triggerAttackRelease(note, "16n", time, 0.25);
        }
      },
      pattern,
      "2n"
    );

    loop.start(`${idx * 0.5}`);
  });
}

function exportMidi() {
  if (!state.musicProfile) {
    return;
  }

  const midiBytes = buildSimpleMidi(state.musicProfile);
  const blob = new Blob([midiBytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "muusikaline-pilt.mid";
  a.click();
  URL.revokeObjectURL(url);

  setStatus("MIDI fail eksporditud.");
}

function generateShareLink() {
  if (!state.musicProfile) {
    return;
  }

  const payload = {
    p: stylePreset.value,
    c: coPrompt.value.trim().slice(0, 80),
    e: state.emotion.label,
    k: state.musicProfile.key,
    t: state.musicProfile.tempo,
    n: state.sourceNames.join("|").slice(0, 200),
  };

  const encoded = encodeURIComponent(JSON.stringify(payload));
  const link = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
  shareOutput.textContent = link;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).catch(() => {
      // ignore clipboard errors
    });
  }

  setStatus("Jagamislink loodud ja kopeeritud.");
}

function hydrateFromShareHash() {
  const rawHash = window.location.hash || "";
  if (!rawHash.startsWith("#share=")) {
    return;
  }

  try {
    const encoded = rawHash.slice(7);
    const data = JSON.parse(decodeURIComponent(encoded));

    if (data.p && STYLE_PRESETS[data.p]) {
      stylePreset.value = data.p;
    }
    if (data.c) {
      coPrompt.value = data.c;
    }

    setStatus("Leitud jagamislink. Lae pilt ja vajuta Analüüsi.");
  } catch (error) {
    console.error(error);
  }
}

function clearAnalysisOutput() {
  palette.innerHTML = "";
  objectList.innerHTML = "";
  musicInfo.innerHTML = "";
  emotionInfo.innerHTML = "";
  objectInstrumentInfo.innerHTML = "";
  timelineInfo.innerHTML = "";
  shareOutput.textContent = "";
}

function setStatus(message) {
  statusLine.textContent = message;
}

function parseTextInfluence(text) {
  if (!text) {
    return { tempoShift: 0, energyBoost: 0, octaveLift: 0, noteDensity: 0 };
  }

  const lower = text.toLowerCase();
  let tempoShift = 0;
  let energyBoost = 0;
  let octaveLift = 0;
  let noteDensity = 0;

  if (/(fast|quick|energi|tants|dance|club)/.test(lower)) {
    tempoShift += 12;
    energyBoost += 0.12;
    noteDensity += 0.08;
  }
  if (/(slow|rahulik|rain|vihm|night|öö|ambient)/.test(lower)) {
    tempoShift -= 10;
    energyBoost -= 0.08;
    noteDensity -= 0.06;
  }
  if (/(bright|sun|päike|happy|joy)/.test(lower)) {
    energyBoost += 0.14;
    octaveLift += 1;
  }
  if (/(dark|deep|sad|tume)/.test(lower)) {
    energyBoost -= 0.06;
    octaveLift -= 1;
  }

  return { tempoShift, energyBoost, octaveLift, noteDensity };
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const imageRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;

  let drawW = w;
  let drawH = h;
  let dx = x;
  let dy = y;

  if (imageRatio > boxRatio) {
    drawH = h;
    drawW = h * imageRatio;
    dx = x - (drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imageRatio;
    dy = y - (drawH - h) / 2;
  }

  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function midiToNote(midi) {
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function noteToMidi(noteName) {
  const match = noteName.match(/^([A-G]#?)(-?\d)$/);
  if (!match) {
    return 60;
  }

  const [, name, octaveStr] = match;
  const idx = NOTE_NAMES.indexOf(name);
  const octave = Number(octaveStr);
  return (octave + 1) * 12 + idx;
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((value) => {
        const hex = value.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      })
      .join("")
  );
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) {
      h = ((gn - bn) / d) % 6;
    } else if (max === gn) {
      h = (bn - rn) / d + 2;
    } else {
      h = (rn - gn) / d + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }

  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSimpleMidi(profile) {
  const ticksPerQuarter = 96;
  const events = [];
  const tempoMicro = Math.floor(60000000 / profile.tempo);

  events.push({ delta: 0, bytes: [0xff, 0x51, 0x03, (tempoMicro >> 16) & 0xff, (tempoMicro >> 8) & 0xff, tempoMicro & 0xff] });

  let delay = 0;
  for (const note of profile.melody.slice(0, 32)) {
    if (!note) {
      delay += ticksPerQuarter / 2;
      continue;
    }

    const midi = noteToMidi(note);
    events.push({ delta: delay, bytes: [0x90, midi, 92] });
    events.push({ delta: ticksPerQuarter / 2, bytes: [0x80, midi, 0] });
    delay = 0;
  }

  events.push({ delta: ticksPerQuarter, bytes: [0xff, 0x2f, 0x00] });

  const trackData = [];
  events.forEach((event) => {
    trackData.push(...encodeVarLen(event.delta), ...event.bytes);
  });

  const header = [
    0x4d, 0x54, 0x68, 0x64,
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x00,
    0x00, 0x01,
    (ticksPerQuarter >> 8) & 0xff,
    ticksPerQuarter & 0xff,
  ];

  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b,
    (trackData.length >> 24) & 0xff,
    (trackData.length >> 16) & 0xff,
    (trackData.length >> 8) & 0xff,
    trackData.length & 0xff,
  ];

  return new Uint8Array([...header, ...trackHeader, ...trackData]);
}

function encodeVarLen(value) {
  let buffer = value & 0x7f;
  const bytes = [];

  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}
