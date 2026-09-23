import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";

// One shared rig drives the body and overlay. The feet remain planted through each rep.
const STANDING = {
  shoulder: [214, 113],
  hip: [210, 205],
  knee: [212, 287],
  elbow: [225, 159],
  wrist: [235, 207],
};
const LOWERING = {
  shoulder: [216, 136],
  hip: [185, 223],
  knee: [232, 290],
  elbow: [245, 174],
  wrist: [283, 204],
};
const PHASES = [
  { ...STANDING, label: "Standing", cue: "Ready. Lower with control." },
  { ...LOWERING, label: "Lowering", cue: "Take your time on the way down." },
  {
    shoulder: [216, 192],
    hip: [167, 270],
    knee: [246, 295],
    elbow: [260, 209],
    wrist: [302, 185],
    label: "Squat depth",
    cue: "Good depth. Drive back up.",
  },
  { ...LOWERING, label: "Rising", cue: "Stand tall to finish the rep." },
  { ...STANDING, label: "Rep complete", cue: "Rep complete. Nicely done." },
];
const ANKLE = [212, 369];
const line = (...points) =>
  points.map((point, i) => `${i ? "L" : "M"}${point.join(" ")}`).join(" ");

export default function HomeCoachPreview({ onTryCoach }) {
  const host = useRef(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [reps, setReps] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
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
    if (reducedMotion || paused || !visible || !pageVisible) return undefined;
    const timer = window.setTimeout(
      () => {
        const next = (phaseIndex + 1) % PHASES.length;
        setPhaseIndex(next);
        if (next === 4) setReps((count) => count + 1);
      },
      phaseIndex === 0 || phaseIndex === 4 ? 1400 : 1000,
    );
    return () => window.clearTimeout(timer);
  }, [phaseIndex, reducedMotion, paused, visible, pageVisible]);

  const phase = PHASES[reducedMotion ? 2 : phaseIndex];
  const { shoulder: s, hip: h, knee: k, elbow: e, wrist: w } = phase;
  const head = [s[0] + 5, s[1] - 43];
  const shortsEnd = [h[0] + (k[0] - h[0]) * 0.52, h[1] + (k[1] - h[1]) * 0.52];
  const a = [h[0] - k[0], h[1] - k[1]],
    b = [ANKLE[0] - k[0], ANKLE[1] - k[1]];
  const angle = Math.round(
    (Math.acos(
      Math.max(
        -1,
        Math.min(
          1,
          (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b)),
        ),
      ),
    ) *
      180) /
      Math.PI,
  );
  const torso = `M${s[0] - 18} ${s[1] - 8} Q${s[0]} ${s[1] - 19} ${s[0] + 20} ${s[1]} L${h[0] + 18} ${h[1] + 3} Q${h[0]} ${h[1] + 13} ${h[0] - 19} ${h[1]} Z`;

  return (
    <figure
      className="home-coach"
      ref={host}
      aria-label="Illustrated Camera Coach demonstration"
    >
      <figcaption className="home-coach-heading">
        <div>
          <span className="home-kicker">Meet your Camera Coach</span>
          <h2>A little guidance. Every rep.</h2>
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
      <div className="home-coach-stage" data-phase={phase.label}>
        <span className="home-demo-label">Illustrated demo · Squat</span>
        <div className="home-demo-reps">
          <span>Demo reps</span>
          <strong>{String(reps).padStart(2, "0")}</strong>
          <small>{phase.label}</small>
        </div>
        <svg
          className="home-athlete"
          viewBox="0 0 430 410"
          role="img"
          aria-label="Side-view athlete demonstrating a squat with tracked shoulder, hip, knee and ankle joints"
        >
          <defs>
            <linearGradient id="home-shirt" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#408bf0" />
              <stop offset="1" stopColor="#1956b4" />
            </linearGradient>
            <linearGradient id="home-skin" x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#d6a07a" />
              <stop offset="1" stopColor="#b97c57" />
            </linearGradient>
          </defs>
          <ellipse
            cx="215"
            cy="385"
            rx="145"
            ry="18"
            fill="#c1d7cf"
            opacity=".45"
          />
          <path
            d="M74 368 L295 351 L368 380 L145 399 Z"
            fill="#9fbeb4"
            opacity=".6"
          />
          <g className="home-athlete-far" transform="translate(-14 0)">
            <path className="home-limb" d={line(h, k, ANKLE)} />
            <path className="home-shorts" d={line(h, shortsEnd)} />
            <path className="home-arm" d={line(s, e, w)} />
            <path
              className="home-shoe"
              d="M203 370 L225 370 L239 378 Q241 385 231 385 L195 385 Q188 381 194 374 Z"
            />
          </g>
          <path className="home-limb" d={line(h, k, ANKLE)} />
          <path className="home-shorts" d={line(h, shortsEnd)} />
          <path
            className="home-neck"
            d={line([head[0] - 4, head[1] + 20], s)}
          />
          <path className="home-shirt" d={torso} />
          <path
            className="home-shirt-seam"
            d={line([s[0] - 11, s[1] + 14], [h[0] - 10, h[1] - 6])}
          />
          <ellipse
            className="home-head"
            cx={head[0]}
            cy={head[1]}
            rx="19"
            ry="26"
          />
          <path
            className="home-head"
            d={`M${head[0] + 16} ${head[1] - 4} L${head[0] + 24} ${head[1] + 4} L${head[0] + 16} ${head[1] + 7} Z`}
          />
          <circle cx={head[0] + 11} cy={head[1] - 4} r="1.4" fill="#29392f" />
          <path
            className="home-hair"
            d={`M${head[0] - 18} ${head[1] + 1} Q${head[0] - 28} ${head[1] - 28} ${head[0]} ${head[1] - 28} Q${head[0] + 20} ${head[1] - 27} ${head[0] + 20} ${head[1] - 11} L${head[0] - 2} ${head[1] - 14} L${head[0] - 7} ${head[1] + 1} Z`}
          />
          <path className="home-arm" d={line(s, e, w)} />
          <path
            className="home-sleeve"
            d={line(s, [
              s[0] + (e[0] - s[0]) * 0.24,
              s[1] + (e[1] - s[1]) * 0.24,
            ])}
          />
          <path
            className="home-shoe"
            d="M203 370 L225 370 L239 378 Q241 385 231 385 L195 385 Q188 381 194 374 Z"
          />
          <path
            className="home-tracking-line"
            d={`${line(s, h, k, ANKLE)} ${line(s, e, w)}`}
          />
          {[s, h, k, ANKLE, e, w].map(([x, y], i) => (
            <circle
              className="home-tracking-node"
              key={i}
              cx={x}
              cy={y}
              r="4.3"
            />
          ))}
        </svg>
        <div className="home-demo-angle">
          <span>Knee angle</span>
          <strong>{angle}°</strong>
          <small>Tracked as you move</small>
        </div>
      </div>
      <div className="home-coach-cue">
        <CheckCircle2 size={18} />
        <span>{phase.cue}</span>
      </div>
      <div className="home-coach-foot">
        <span>
          <ShieldCheck size={15} /> No recording. No uploads.
        </span>
        <button
          className="visual-launch-coach"
          type="button"
          onClick={onTryCoach}
        >
          Try it live <ArrowRight size={16} />
        </button>
      </div>
    </figure>
  );
}
