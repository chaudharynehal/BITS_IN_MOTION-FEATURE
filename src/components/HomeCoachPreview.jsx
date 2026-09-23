import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Pause, Play, ShieldCheck } from "lucide-react";

// Side-view squat rig. Every body part and every landmark is derived from the same
// joint chain (ankle → knee → hip → shoulder → elbow → wrist), so the overlay can never drift.
const ANKLE = [212, 378];
const SHANK = 96;
const THIGH = 100;
const TORSO = 110;
const UPPER_ARM = 56;
const FOREARM = 54;
const RAD = Math.PI / 180;

const PHASES = [
  { id: "standing", label: "Standing", cue: "Stand tall. Feet planted, chest up.", ms: 900, from: 0, to: 0 },
  { id: "lowering", label: "Lowering", cue: "Hips back and down. Knees track over toes.", ms: 1150, from: 0, to: 1 },
  { id: "bottom", label: "Bottom position", cue: "Good depth. Hold it steady.", ms: 520, from: 1, to: 1 },
  { id: "rising", label: "Rising", cue: "Drive through your heels. Extend hips and knees.", ms: 1000, from: 1, to: 0 },
  { id: "complete", label: "Rep complete", cue: "Rep complete. Reset and go again.", ms: 900, from: 0, to: 0 },
];
const CYCLE = PHASES.reduce((sum, phase) => sum + phase.ms, 0);
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const polar = ([x, y], length, degFromDown) => [x + Math.sin(degFromDown * RAD) * length, y + Math.cos(degFromDown * RAD) * length];
const path = (...points) => points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

export function squatPose(t) {
  const shank = lerp(0, 27, t);
  const thigh = lerp(0, 76, t);
  const lean = lerp(0, 36, t);
  const knee = polar(ANKLE, SHANK, 180 - shank);
  const hip = polar(knee, THIGH, 180 + thigh);
  const shoulder = polar(hip, TORSO, 180 - lean);
  const elbow = polar(shoulder, UPPER_ARM, lerp(10, 84, t));
  const wrist = polar(elbow, FOREARM, lerp(4, 92, t));
  const head = polar(shoulder, 44, 180 - lean * 0.55);
  const kneeAngle = Math.round(180 - shank - thigh);
  return { ankle: ANKLE, knee, hip, shoulder, elbow, wrist, head, lean, kneeAngle, depth: t };
}

function phaseAt(ms) {
  let cursor = ms % CYCLE;
  for (let i = 0; i < PHASES.length; i += 1) {
    const phase = PHASES[i];
    if (cursor < phase.ms) return { index: i, t: lerp(phase.from, phase.to, ease(cursor / phase.ms)) };
    cursor -= phase.ms;
  }
  return { index: 0, t: 0 };
}

function perpendicular(a, b, width) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [(-dy / len) * width, (dx / len) * width];
}

function torsoPath(shoulder, hip) {
  const [nx, ny] = perpendicular(hip, shoulder, 1);
  const s1 = [shoulder[0] + nx * 19, shoulder[1] + ny * 19];
  const s2 = [shoulder[0] - nx * 17, shoulder[1] - ny * 17];
  const h1 = [hip[0] + nx * 21, hip[1] + ny * 21];
  const h2 = [hip[0] - nx * 17, hip[1] - ny * 17];
  return `M${s1} Q${shoulder[0] + ny * 14} ${shoulder[1] - nx * 14} ${s2} L${h2} Q${hip[0] - ny * 13} ${hip[1] + nx * 13} ${h1} Z`;
}

function kneeArc(pose) {
  const { knee, hip, ankle } = pose;
  const r = 30;
  const toHip = Math.atan2(hip[1] - knee[1], hip[0] - knee[0]);
  const toAnkle = Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]);
  const start = [knee[0] + Math.cos(toHip) * r, knee[1] + Math.sin(toHip) * r];
  const end = [knee[0] + Math.cos(toAnkle) * r, knee[1] + Math.sin(toAnkle) * r];
  return `M${start[0]} ${start[1]} A${r} ${r} 0 0 1 ${end[0]} ${end[1]}`;
}

function applyPose(svg, pose) {
  if (!svg) return;
  const { ankle, knee, hip, shoulder, elbow, wrist, head, lean, depth } = pose;
  const set = (part, attrs) => {
    const node = svg.querySelector(`[data-part="${part}"]`);
    if (node) Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  };
  const back = (p) => [p[0] - 9, p[1] + 2];
  const midThigh = [lerp(hip[0], knee[0], 0.55), lerp(hip[1], knee[1], 0.55)];
  const foot = (a) => `M${a[0] - 16} ${a[1] + 4} L${a[0] + 30} ${a[1] + 4} Q${a[0] + 40} ${a[1] + 6} ${a[0] + 36} ${a[1] + 14} L${a[0] - 14} ${a[1] + 14} Q${a[0] - 22} ${a[1] + 10} ${a[0] - 16} ${a[1] + 4} Z`;
  set("leg-far", { d: path(back(hip), back(knee), back(ankle)) });
  set("shorts-far", { d: path(back(hip), back(midThigh)) });
  set("foot-far", { d: foot(back(ankle)) });
  set("arm-far", { d: path(back(shoulder), back(elbow), back(wrist)) });
  set("leg", { d: path(hip, knee, ankle) });
  set("shorts", { d: path(hip, midThigh) });
  set("foot", { d: foot(ankle) });
  set("torso", { d: torsoPath(shoulder, hip) });
  set("neck", { d: path(shoulder, [lerp(shoulder[0], head[0], 0.5), lerp(shoulder[1], head[1], 0.5)]) });
  set("head", { cx: head[0], cy: head[1] });
  set("hair", { transform: `translate(${head[0]} ${head[1]}) rotate(${lean * 0.45})` });
  set("face", { transform: `translate(${head[0]} ${head[1]}) rotate(${lean * 0.45})` });
  set("arm", { d: path(shoulder, elbow, wrist) });
  set("sleeve", { d: path(shoulder, [lerp(shoulder[0], elbow[0], 0.3), lerp(shoulder[1], elbow[1], 0.3)]) });
  set("shadow", { rx: (104 + depth * 26).toFixed(1), cx: (222 + depth * 30).toFixed(1) });
  set("bones", { d: `${path(shoulder, hip, knee, ankle)} ${path(shoulder, elbow, wrist)}` });
  set("knee-arc", { d: kneeArc(pose), opacity: pose.kneeAngle > 165 ? 0 : 1 });
  [["j-shoulder", shoulder], ["j-elbow", elbow], ["j-wrist", wrist], ["j-hip", hip], ["j-knee", knee], ["j-ankle", ankle]].forEach(([part, point]) => set(part, { cx: point[0], cy: point[1] }));
}

export default function HomeCoachPreview({ onTryCoach }) {
  const host = useRef(null);
  const svgRef = useRef(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [kneeAngle, setKneeAngle] = useState(180);
  const [reps, setReps] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const clock = useRef({ elapsed: 0, last: 0, phase: 0 });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(host.current);
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      const pose = squatPose(0.92);
      applyPose(svgRef.current, pose);
      setKneeAngle(pose.kneeAngle);
      setPhaseIndex(2);
      return undefined;
    }
    if (paused || !visible || !pageVisible) {
      applyPose(svgRef.current, squatPose(phaseAt(clock.current.elapsed).t));
      return undefined;
    }
    let frame;
    clock.current.last = performance.now();
    const tick = (now) => {
      const state = clock.current;
      state.elapsed += Math.min(64, now - state.last);
      state.last = now;
      const { index, t } = phaseAt(state.elapsed);
      const pose = squatPose(t);
      applyPose(svgRef.current, pose);
      setKneeAngle((current) => (Math.abs(current - pose.kneeAngle) >= 2 ? pose.kneeAngle : current));
      if (index !== state.phase) {
        state.phase = index;
        setPhaseIndex(index);
        if (index === 4) setReps((count) => count + 1);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, paused, visible, pageVisible]);

  const phase = PHASES[phaseIndex];
  const tracking = phase.id === "bottom" ? "Depth reached" : phase.id === "complete" ? "Rep counted" : "Tracking 6 joints";

  return (
    <figure className="home-coach" ref={host} aria-label="Illustrated Camera Coach demonstration">
      <figcaption className="home-coach-heading">
        <div>
          <span className="home-kicker">Meet your Camera Coach</span>
          <h2>Every rep, seen and counted.</h2>
        </div>
        {!reducedMotion && (
          <button
            className="home-icon-button"
            type="button"
            aria-label={paused ? "Play demonstration" : "Pause demonstration"}
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={17} /> : <Pause size={17} />}
          </button>
        )}
      </figcaption>
      <div className="home-coach-stage" data-phase={phase.label} data-phase-id={phase.id}>
        <div className="home-demo-topline">
          <span className="home-demo-label">Squat <small>· illustrated demo</small></span>
          <span className="home-demo-tracking" data-state={phase.id}><i />{tracking}</span>
        </div>
        <div className="home-demo-reps">
          <span>Reps</span>
          <strong>{String(reps).padStart(2, "0")}</strong>
          <small>{phase.label}</small>
        </div>
        <svg ref={svgRef} className="home-athlete" viewBox="0 -64 430 494" role="img" aria-label="Side-view athlete demonstrating a squat with tracked shoulder, elbow, wrist, hip, knee and ankle joints">
          <defs>
            <linearGradient id="home-shirt" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#3f8cf2" />
              <stop offset="1" stopColor="#1a58b8" />
            </linearGradient>
            <linearGradient id="home-floor" x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#c6d9d0" stopOpacity="0" />
              <stop offset=".5" stopColor="#b9d0c6" />
              <stop offset="1" stopColor="#c6d9d0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse data-part="shadow" cx="222" cy="400" rx="110" ry="9" fill="#1d3a2f" opacity=".12" />
          <rect x="82" y="392" width="280" height="2" fill="url(#home-floor)" />
          <g className="home-athlete-far">
            <path data-part="arm-far" className="home-arm" />
            <path data-part="leg-far" className="home-limb" />
            <path data-part="shorts-far" className="home-shorts" />
            <path data-part="foot-far" className="home-shoe" />
          </g>
          <path data-part="leg" className="home-limb" />
          <path data-part="shorts" className="home-shorts" />
          <path data-part="foot" className="home-shoe" />
          <path data-part="neck" className="home-neck" />
          <path data-part="torso" className="home-shirt" />
          <circle data-part="head" className="home-head" r="21" />
          <g data-part="hair">
            <path className="home-hair" d="M-21 -2 Q-22 -26 2 -26 Q22 -26 21 -6 Q10 -14 -4 -10 Q-16 -6 -21 -2 Z" />
          </g>
          <g data-part="face">
            <circle cx="11" cy="-3" r="1.6" fill="#2b3a3a" />
            <path d="M17 2 Q21 5 17 8" fill="none" stroke="#a86f4d" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          <path data-part="arm" className="home-arm" />
          <path data-part="sleeve" className="home-sleeve" />
          <g className="home-tracking" aria-hidden="true">
            <path data-part="bones" className="home-tracking-line" />
            <path data-part="knee-arc" className="home-knee-arc" />
            <circle data-part="j-shoulder" className="home-tracking-node" r="5" />
            <circle data-part="j-elbow" className="home-tracking-node" r="5" />
            <circle data-part="j-wrist" className="home-tracking-node" r="5" />
            <circle data-part="j-hip" className="home-tracking-node is-key" r="6.5" />
            <circle data-part="j-knee" className="home-tracking-node is-key" r="6.5" />
            <circle data-part="j-ankle" className="home-tracking-node is-key" r="6.5" />
          </g>
        </svg>
        <div className="home-demo-angle">
          <span>Knee angle</span>
          <strong>{kneeAngle}°</strong>
        </div>
      </div>
      <ol className="home-demo-flow" aria-label="How Camera Coach works">
        <li>Camera</li>
        <li>Landmarks</li>
        <li>Movement</li>
        <li>Rep</li>
        <li>Cue</li>
      </ol>
      <div className="home-coach-cue" role="status" aria-live="off">
        <CheckCircle2 size={18} />
        <span>{phase.cue}</span>
      </div>
      <div className="home-coach-foot">
        <span><ShieldCheck size={15} /> Processed on your device. Never recorded.</span>
        <button className="visual-launch-coach" type="button" onClick={onTryCoach}>
          Try it live <ArrowRight size={16} />
        </button>
      </div>
    </figure>
  );
}
