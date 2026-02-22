/**
 * SalitAI.orbit Frontend
 * File: app.tsx
 * Version: 1.1.0
 * Purpose: Full React UI + STT (Backend /api/stt) + Gemini Minutes + Export + Contact submit + Built-in prompt presets
 *          + Rotating About quotes + Smooth animated navigation scrolling.
 * Notes:
 * - Backend STT provider can be Deepgram/Whisper/ElevenLabs; frontend uses /api/stt only.
 * - Mobile view improved: responsive heights, spacing, stacking, and overflow handling.
 */

import React from "react";
import { marked } from "marked";
import {
  download_docx,
  download_markdown,
  download_pdf,
} from "./utils/export_utils";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8082";

type Busy = "idle" | "recording" | "uploading" | "generating";

function class_names(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

type PromptPreset = {
  id: string;
  name: string;
  document_type?: string;
  response_style?: string;
  directives: string;
};

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "minutes_exec",
    name: "Executive Minutes (Default)",
    document_type: "Executive Meeting Minutes",
    response_style: "Concise, professional, actionable",
    directives: [
      "You are a meeting-minutes generator.",
      "Output MUST be in Markdown.",
      "",
      "Structure:",
      "- Title",
      "- Date/Time/Location (if mentioned)",
      "- Attendees (if mentioned)",
      "- Agenda (bullets)",
      "- Discussion Summary (group by topic)",
      "- Decisions (bullets)",
      "- Action Items (Owner, Task, Due Date, Status)",
      "- Risks/Blockers",
      "- Next Meeting (if mentioned)",
      "",
      "Rules:",
      "- Do NOT invent names/dates. If missing, write 'Not specified'.",
      "- Keep it executive-level; remove filler words.",
      "- Convert vague items into clear actions when possible, but do not hallucinate details.",
    ].join("\n"),
  },
  {
    id: "project_summary",
    name: "Project Summary",
    document_type: "Standard Project Summary",
    response_style: "Structured, technical, short paragraphs",
    directives: [
      "Summarize the transcript as a project update.",
      "Output in Markdown with sections:",
      "- Overview",
      "- Key Updates",
      "- Metrics/Numbers mentioned",
      "- Risks",
      "- Next Steps (bullets)",
      "",
      "Rules:",
      "- Only use facts from transcript.",
      "- If something is unclear, add a 'Questions' section.",
    ].join("\n"),
  },
  {
    id: "post_mortem",
    name: "Post-Mortem (Blameless)",
    document_type: "Project Post-Mortem",
    response_style: "Blameless, detailed, engineering tone",
    directives: [
      "Create a blameless post-mortem based ONLY on the transcript.",
      "Output in Markdown with sections:",
      "- Incident Summary",
      "- Timeline",
      "- Impact",
      "- Root Cause(s)",
      "- Contributing Factors",
      "- What Went Well",
      "- What Went Wrong",
      "- Action Items (table: Owner | Action | Priority | Due Date)",
      "",
      "Rules:",
      "- Do NOT guess times; mark as 'Unknown' if missing.",
      "- Keep it factual and blameless.",
    ].join("\n"),
  },
  {
    id: "step_by_step",
    name: "Step-by-Step Guide",
    document_type: "Step-by-Step Guide",
    response_style: "Clear, numbered, beginner-friendly",
    directives: [
      "Convert the transcript into a step-by-step guide.",
      "Output in Markdown with:",
      "- Goal",
      "- Prerequisites",
      "- Steps (numbered)",
      "- Common Mistakes",
      "- Checklist",
      "",
      "Rules:",
      "- Keep steps short and actionable.",
      "- Do not invent tools or requirements not stated in transcript.",
    ].join("\n"),
  },
];

type AboutQuote = {
  quote: string;
  author: string;
  role: string;
  initials: string;
};

const ABOUT_QUOTES: AboutQuote[] = [
  {
    quote:
      '"We bridge the gap between a small spark and a global standard. Our focus on the details ensures that every system we build is stable and scalable."',
    author: "Gene Elpie Landoy",
    role: "Founder, DotOrbit",
    initials: "EL",
  },
  {
    quote:
      '"We turn precise data points into global systems. Our mission is to provide the steady gravity that keeps every innovation in constant motion."',
    author: "Jayson Nunez",
    role: "Co-Founder, DotOrbit",
    initials: "JN",
  },
  {
    quote:
      '"Great technology starts with a single and perfect core. We build the digital infrastructure that allows those ideas to reach their full potential.  "',
    author: "Mark John Matining",
    role: "Co-Founder, DotOrbit",
    initials: "MJ",
  },
];

/**
 * NAV SMOOTH SCROLL CONFIG
 */
const SCROLL_DURATION_MS = 650;
const SECTION_PULSE_CLASS = "section-pulse-once";

/**
 * We keep your HTML exactly the same sizing; we only add `data-nav` attributes
 * so React can attach click handlers for animated scroll.
 */
const ORIGINAL_HEADER_HTML =
  '<header class="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-black/20 backdrop-blur-xl">\n<div class="mx-auto max-w-6xl px-6 lg:px-10">\n<div class="flex h-20 items-center justify-between">\n<a class="text-xl font-bold tracking-tighter" href="#home" data-nav="#home">\n<span class="text-white">salit</span><span class="brand-gradient">AI.orbit</span>\n</a>\n<nav class="hidden md:flex items-center gap-10 text-[10px] tracking-[0.3em] text-white/50">\n<a class="hover:text-white transition uppercase" href="#home" data-nav="#home">Home</a>\n<a class="hover:text-white transition uppercase" href="#try" data-nav="#try">Platform</a>\n<a class="hover:text-white transition uppercase" href="#about" data-nav="#about">About</a>\n<a class="hover:text-white transition uppercase" href="#contact" data-nav="#contact">Contact</a>\n</nav>\n<button class="md:hidden p-2 text-white/70" id="menu_btn">\n<svg class="w-6 h-6" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M4 8h16M4 16h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>\n</button>\n</div>\n<div class="hidden md:hidden absolute left-0 w-full bg-black/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] z-50" id="mobile_menu">\n<div class="flex flex-col p-4 space-y-2">\n<a class="group relative flex items-center justify-center w-full py-4 overflow-hidden rounded-xl transition-all duration-300 hover:bg-white/5 active:scale-95" href="#home" data-nav="#home">\n<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>\n<span class="relative z-10 text-xs font-bold tracking-[0.25em] text-white/50 group-hover:text-white group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-all duration-300">HOME</span>\n</a>\n<a class="group relative flex items-center justify-center w-full py-4 overflow-hidden rounded-xl transition-all duration-300 hover:bg-white/5 active:scale-95" href="#try" data-nav="#try">\n<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>\n<span class="relative z-10 text-xs font-bold tracking-[0.25em] text-white/50 group-hover:text-white group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-all duration-300">PLATFORM</span>\n</a>\n<a class="group relative flex items-center justify-center w-full py-4 overflow-hidden rounded-xl transition-all duration-300 hover:bg-white/5 active:scale-95" href="#about" data-nav="#about">\n<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>\n<span class="relative z-10 text-xs font-bold tracking-[0.25em] text-white/50 group-hover:text-white group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-all duration-300">ABOUT</span>\n</a>\n<a class="group relative flex items-center justify-center w-full py-4 overflow-hidden rounded-xl transition-all duration-300 hover:bg-white/5 active:scale-95" href="#contact" data-nav="#contact">\n<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>\n<span class="relative z-10 text-xs font-bold tracking-[0.25em] text-white/50 group-hover:text-white group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-all duration-300">CONTACT</span>\n</a>\n</div>\n</div>\n</div>\n</header>';

const ORIGINAL_HOME_HTML =
  '<section class="relative min-h-screen flex items-center overflow-hidden pt-24 lg:pt-0" id="home">\n\
<div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.08)_0%,_transparent_70%)] pointer-events-none"></div>\n\
<div class="max-w-6xl mx-auto px-6 w-full relative z-10">\n\
<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">\n\
<div class="lg:col-span-7 text-center lg:text-left order-2 lg:order-1">\n\
<div class="hero-content">\n\
<h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-white">\n\
 Streamline your <br/>\n\
<span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 animate-gradient">\n\
 Intelligence.\n\
 </span>\n\
</h1>\n\
<p class="mt-8 text-lg md:text-xl text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">\n\
 An AI-driven environment built to transform <span class="text-slate-200">messy boardroom discussions</span> into structured, actionable documentation instantly.\n\
 </p>\n\
<div class="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">\n\
<a class="group relative px-10 py-4 bg-white text-black rounded-full font-bold text-[12px] tracking-[0.15em] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]" href="#try" data-nav="#try">\n\
 LAUNCH PLATFORM\n\
 </a>\n\
<a class="text-[12px] font-bold tracking-[0.15em] text-white/70 hover:text-white transition-colors"\n\
   href="https://youtu.be/Y_EXZ8S8tFY"\n\
   target="_blank"\n\
   rel="noopener noreferrer">\n\
 WATCH DEMO —\n\
 </a>\n\
</div>\n\
</div>\n\
</div>\n\
<div class="lg:col-span-5 flex justify-center order-1 lg:order-2">\n\
<div class="relative w-full max-w-[450px] group">\n\
<div class="absolute -inset-4 bg-gradient-to-tr from-blue-600/30 to-purple-600/30 blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>\n\
<div class="relative float-anim">\n\
<div class="absolute inset-0 rounded-3xl pointer-events-none"></div>\n\
<img alt="Core Intelligence" class="relative z-10 w-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-[1.02]" src="assets/img/hero.png"/>\n\
</div>\n\
</div>\n\
</div>\n\
</div>\n\
</div>\n\
</section>';

const ORIGINAL_ENGINE_STRIP_HTML =
  '<div class="py-20 border-y border-white/5 bg-[#030408] relative overflow-hidden group">\n<div class="absolute inset-0 pointer-events-none">\n<div class="absolute inset-y-0 w-[150px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -skew-x-12 animate-[scan_6s_linear_infinite]"></div>\n</div>\n<div class="max-w-6xl mx-auto px-6 relative z-10">\n<p class="text-[9px] font-bold tracking-[0.6em] text-center text-white/20 uppercase mb-12 shimmer">\n            Engineered with High-Fidelity Intelligence\n        </p>\n<div class="flex flex-wrap justify-center items-center gap-8 lg:gap-16">\n<div class="group/item flex items-center gap-3 transition-all duration-500">\n<div class="relative">\n<div class="absolute inset-0 bg-blue-400/20 blur-md rounded-full scale-0 group-hover/item:scale-150 transition-transform duration-500"></div>\n<svg class="w-6 h-6 text-blue-400 relative z-10" fill="currentColor" viewbox="0 0 24 24">\n<path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>\n</svg>\n</div>\n<div class="flex flex-col">\n<span class="text-[11px] font-bold text-white/80 tracking-tighter group-hover/item:text-blue-400 transition-colors">Gemini</span>\n<div class="flex items-center gap-1.5">\n<span class="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></span>\n<span class="text-[8px] text-white/20 font-mono uppercase tracking-widest">Logic_Core</span>\n</div>\n</div>\n</div>\n<div class="group/item flex items-center gap-3 transition-all duration-500">\n<div class="relative">\n<div class="absolute inset-0 bg-purple-400/20 blur-md rounded-full scale-0 group-hover/item:scale-150 transition-transform duration-500"></div>\n<svg class="w-6 h-6 text-purple-400 relative z-10" fill="none" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24">\n<path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" stroke-linecap="round" stroke-linejoin="round"></path>\n</svg>\n</div>\n<div class="flex flex-col">\n<span class="text-[11px] font-bold text-white/80 tracking-tighter group-hover/item:text-purple-400 transition-colors">Gemini STT</span>\n<div class="flex items-center gap-1.5">\n<span class="w-1 h-1 bg-purple-500 rounded-full animate-pulse"></span>\n<span class="text-[8px] text-white/20 font-mono uppercase tracking-widest">Voice_Synth</span>\n</div>\n</div>\n</div>\n<div class="group/item flex items-center gap-3 transition-all duration-500">\n<div class="relative">\n<div class="absolute inset-0 bg-cyan-400/20 blur-md rounded-full scale-0 group-hover/item:scale-150 transition-transform duration-500"></div>\n<svg class="w-6 h-6 text-cyan-400 relative z-10 animate-[spin_8s_linear_infinite]" fill="none" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24">\n<circle cx="12" cy="12" fill="currentColor" r="2"></circle>\n<ellipse cx="12" cy="12" rx="10" ry="4"></ellipse>\n<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"></ellipse>\n<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"></ellipse>\n</svg>\n</div>\n<div class="flex flex-col">\n<span class="text-[11px] font-bold text-white/80 tracking-tighter group-hover/item:text-cyan-400 transition-colors">React v18</span>\n<div class="flex items-center gap-1.5">\n<span class="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></span>\n<span class="text-[8px] text-white/20 font-mono uppercase tracking-widest">Interface_Lib</span>\n</div>\n</div>\n</div>\n</div>\n</div>\n</div>\n</div>\n</div>\n</div>';

/**
 * NOTE: Sizing/classes unchanged — only IDs were added so React can rotate quote text.
 */
const ORIGINAL_ABOUT_HTML = `<section class="py-32 border-t border-white/5 max-w-6xl mx-auto px-6 relative overflow-hidden" id="about">
<div class="absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] -z-10"></div>
<div class="absolute bottom-0 left-0 w-[500px] h-[500px] blur-[120px] -z-10"></div>
<div class="grid md:grid-cols-5 gap-16 lg:gap-24 items-start">
<div class="md:col-span-2 space-y-8 about-left sticky top-29 self-start">
<div>
<h2 class="text-[10px] font-bold tracking-[0.6em] text-blue-400 uppercase mb-6 flex items-center gap-4">
<span class="w-8 h-[1px] bg-blue-400/50"></span>
                    The Collective
                </h2>
<h3 class="text-6xl font-bold leading-[0.85] tracking-tighter">
                    United by <br/>
<span class="brand-gradient">Logic.</span>
</h3>
</div>
<div class="relative p-10 rounded-[3rem] bg-white/[0.02] border border-white/10 backdrop-blur-3xl group min-h-[320px] flex flex-col justify-between">
<div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[3rem]"></div>
<div class="relative z-10">
<svg class="w-10 h-10 text-blue-500/20 mb-6" fill="currentColor" viewbox="0 0 24 24">
<path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C15.4647 8 15.017 8.44772 15.017 9V12C15.017 12.5523 14.5693 13 14.017 13H13.017V21H14.017ZM6.017 21L6.017 18C6.017 16.8954 6.91243 16 8.017 16H11.017C11.5693 16 12.017 15.5523 12.017 15V9C12.017 8.44772 11.5693 8 11.017 8H8.017C7.46472 8 7.017 8.44772 7.017 9V12C7.017 12.5523 6.56929 13 6.017 13H5.017V21H6.017Z"></path>
</svg>
<p id="about_quote_text" class="text-xl text-white/80 font-medium leading-relaxed">
    "The most powerful systems are those that bridge the gap between human intuition and machine precision."
</p>
</div>
<div class="mt-8 flex items-center gap-4 relative z-10 border-t border-white/5 pt-8">
<div id="about_quote_initials" class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
    SO
</div>
<div>
<p id="about_quote_author" class="text-sm font-bold text-white tracking-tight">SalitAI.orbit</p>
<p id="about_quote_role" class="text-[9px] tracking-[0.2em] text-white/30 uppercase">Founding Architect</p>
</div>
</div>
</div>
</div>
<div class="md:col-span-3 space-y-16 about-right">
<div class="space-y-8">
<p class="text-3xl lg:text-4xl font-bold text-white leading-[1.1] tracking-tight">
                    We Build Technology That Simply <span class="text-white/30">Works for People</span>
</p>
<p class="text-lg text-white/40 leading-relaxed max-w-2xl">
                    SalitAI.orbit is a next-generation technology platform at the intersection of software engineering, artificial intelligence, and human-centered design. Born from the DotOrbit collective, we are a focused team of developers driven to reduce complexity, optimize workflows, and elevate digital productivity through innovative, scalable solutions.
                    Born from the <span class="text-white/80">DotOrbit collective</span>, we are a focused team of developers driven to reduce complexity, optimize workflows, and elevate digital productivity through innovative, scalable solutions.
                </p>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div class="p-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[2rem]">
<div class="bg-[#05060a] p-8 rounded-[2rem] h-full hover:bg-white/[0.02] transition-colors">
<div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-width="2"></path></svg>
</div>
<h4 class="text-white font-bold mb-2 uppercase tracking-widest text-[11px]">Velocity</h4>
<p class="text-white/30 text-xs leading-relaxed">Eliminating the lag between spoken word and formal record.</p>
</div>
</div>
<div class="p-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[2rem]">
<div class="bg-[#05060a] p-8 rounded-[2rem] h-full hover:bg-white/[0.02] transition-colors">
<div class="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"></path><path d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" stroke-width="2"></path></svg>
</div>
<h4 class="text-white font-bold mb-2 uppercase tracking-widest text-[11px]">Symmetry</h4>
<p class="text-white/30 text-xs leading-relaxed">Converting unstructured dialogue into perfectly geometric data.</p>
</div>
</div>
</div>
<div class="pt-8">
<div class="flex items-center gap-6">
<a class="px-8 py-4 bg-white text-black text-[10px] font-bold tracking-[0.3em] rounded-full hover:bg-blue-500 hover:text-white transition-all" href="#contact" data-nav="#contact">
                        JOIN THE ORBIT
                    </a>
<div class="h-[1px] flex-1 bg-white/5"></div>
</div>
</div>
</div>
</div>
</section>`;

const ORIGINAL_FOOTER_HTML =
  '<footer class="py-16 border-t border-white/5 text-center text-[10px] tracking-[1em] text-white/3 uppercase">\n            © <span id="year"></span> salitAI.orbit • Engineered by DotOrbit\n        </footer>';

/* ============================= */
/* NAV / SCROLL HELPERS          */
/* ============================= */

function ease_in_out_cubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function get_fixed_header_offset_px(): number {
  // Your header height is h-20 (80px). Add a small breathing space.
  return 96;
}

function get_element_top_on_page(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return r.top + window.scrollY;
}

function animated_scroll_to(targetY: number, durationMs: number): void {
  const startY = window.scrollY;
  const maxY = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );

  const endY = clamp(targetY, 0, maxY);
  const delta = endY - startY;

  if (Math.abs(delta) < 2) {
    window.scrollTo({ top: endY });
    return;
  }

  const startTs = performance.now();

  const step = (now: number) => {
    const elapsed = now - startTs;
    const t = clamp(elapsed / durationMs, 0, 1);
    const eased = ease_in_out_cubic(t);
    window.scrollTo({ top: startY + delta * eased });

    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function pulse_section_once(section: HTMLElement): void {
  section.classList.remove(SECTION_PULSE_CLASS);
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  section.offsetWidth;
  section.classList.add(SECTION_PULSE_CLASS);

  const removeAfterMs = 1100;
  window.setTimeout(
    () => section.classList.remove(SECTION_PULSE_CLASS),
    removeAfterMs,
  );
}

function close_mobile_menu_if_open(): void {
  const menu = document.getElementById("mobile_menu");
  if (!menu) return;
  if (!menu.classList.contains("hidden")) menu.classList.add("hidden");
}

/* ============================= */
/* APP                           */
/* ============================= */

export default function App(): JSX.Element {
  const [busy, setBusy] = React.useState<Busy>("idle");
  const [transcript, setTranscript] = React.useState<string>("");

  const [document_type, setDocumentType] = React.useState<string>(
    "Executive Meeting Minutes",
  );
  const [response_style, setResponseStyle] = React.useState<string>("");
  const [directives, setDirectives] = React.useState<string>("");

  // Built-in prompt preset + extra notes
  const [preset_id, setPresetId] = React.useState<string>(
    PROMPT_PRESETS[0]?.id ?? "",
  );
  const [extra_notes, setExtraNotes] = React.useState<string>("");

  const [generated_md, setGeneratedMd] = React.useState<string>("");

  const [contact_name, setContactName] = React.useState<string>("");
  const [contact_email, setContactEmail] = React.useState<string>("");
  const [contact_message, setContactMessage] = React.useState<string>("");
  const [contact_status, setContactStatus] = React.useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [contact_error, setContactError] = React.useState<string>("");

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Inject tiny CSS for the section pulse highlight (no sizing changes).
  React.useEffect(() => {
    const STYLE_ID = "salitai_nav_anim_styles";
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes section_pulse_once {
        0%   { box-shadow: 0 0 0 0 rgba(56,189,248,0.0); }
        30%  { box-shadow: 0 0 0 10px rgba(56,189,248,0.08); }
        70%  { box-shadow: 0 0 0 22px rgba(168,85,247,0.06); }
        100% { box-shadow: 0 0 0 0 rgba(56,189,248,0.0); }
      }
      .${SECTION_PULSE_CLASS} {
        animation: section_pulse_once 1.05s ease-out 1;
        border-radius: inherit;
      }

      /* Mobile stability helpers (no global layout breaking) */
      .safe-tap {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(style);
  }, []);

  React.useEffect(() => {
    const btn = document.getElementById("menu_btn");
    const menu = document.getElementById("mobile_menu");
    if (!btn || !menu) return;

    const toggle = () => menu.classList.toggle("hidden");
    btn.addEventListener("click", toggle);
    return () => btn.removeEventListener("click", toggle);
  }, []);

  React.useEffect(() => {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }, []);

  // Animated nav scroll via data-nav
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;

      const link = t.closest("[data-nav]") as HTMLElement | null;
      if (!link) return;

      const hash = link.getAttribute("data-nav") || "";
      if (!hash.startsWith("#")) return;

      const target = document.querySelector(hash) as HTMLElement | null;
      if (!target) return;

      e.preventDefault();

      close_mobile_menu_if_open();

      const headerOffset = get_fixed_header_offset_px();
      const y = get_element_top_on_page(target) - headerOffset;

      animated_scroll_to(y, SCROLL_DURATION_MS);
      window.setTimeout(() => pulse_section_once(target), SCROLL_DURATION_MS);
      window.history.pushState(null, "", hash);
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Rotate About quote
  React.useEffect(() => {
    const quoteEl = document.getElementById("about_quote_text");
    const initialsEl = document.getElementById("about_quote_initials");
    const authorEl = document.getElementById("about_quote_author");
    const roleEl = document.getElementById("about_quote_role");

    if (!quoteEl || !initialsEl || !authorEl || !roleEl) return;

    let idx = 0;

    const apply = (q: AboutQuote) => {
      quoteEl.textContent = q.quote;
      initialsEl.textContent = q.initials;
      authorEl.textContent = q.author;
      roleEl.textContent = q.role;
    };

    apply(ABOUT_QUOTES[idx]);

    const intervalMs = 8000;
    const timer = window.setInterval(() => {
      idx = (idx + 1) % ABOUT_QUOTES.length;
      apply(ABOUT_QUOTES[idx]);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, []);

  // Auto-apply preset to fields when changed
  React.useEffect(() => {
    const p = PROMPT_PRESETS.find((x) => x.id === preset_id);
    if (!p) return;

    if (p.document_type) setDocumentType(p.document_type);
    if (p.response_style) setResponseStyle(p.response_style);
    setDirectives(p.directives);
    setExtraNotes("");
  }, [preset_id]);

  async function stt_from_file(file: File): Promise<string> {
    const form = new FormData();
    form.append("audio", file);

    const r = await fetch(`${API_BASE}/api/stt`, {
      method: "POST",
      body: form,
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || data?.message || "STT failed");
    return String(data?.text || "");
  }

  async function minutes_from_transcript(text: string): Promise<string> {
    const final_directives =
      extra_notes.trim().length > 0
        ? `${directives}\n\n---\nUser Notes:\n${extra_notes.trim()}\n`
        : directives;

    const r = await fetch(`${API_BASE}/api/minutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: text,
        document_type,
        response_style,
        directives: final_directives,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new Error(data?.error || data?.message || "Minutes failed");
    return String(data?.minutes || "");
  }

  async function on_upload(file: File): Promise<void> {
    setBusy("uploading");
    try {
      const text = await stt_from_file(file);
      setTranscript(text);
      setGeneratedMd("");
    } finally {
      setBusy("idle");
    }
  }

  async function start_recording(): Promise<void> {
    if (busy !== "idle") return;

    setBusy("recording");
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const preferred = "audio/webm;codecs=opus";
    const mimeType = MediaRecorder.isTypeSupported(preferred)
      ? preferred
      : undefined;

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const file = new File([blob], "recording.webm", { type: blob.type });

        setBusy("uploading");
        const text = await stt_from_file(file);
        setTranscript(text);
        setGeneratedMd("");
      } catch (e: any) {
        alert(e?.message ?? "Recording failed");
      } finally {
        setBusy("idle");
        const s = streamRef.current;
        if (s) s.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
      }
    };

    recorder.start();
  }

  function stop_recording(): void {
    const r = recorderRef.current;
    if (!r) return;
    if (r.state !== "inactive") r.stop();
  }

  async function generate_summary(): Promise<void> {
    const base = transcript.trim();
    if (!base) {
      alert("Upload audio or record first.");
      return;
    }

    setBusy("generating");
    try {
      const md = await minutes_from_transcript(base);
      setGeneratedMd(md);
      requestAnimationFrame(() => {
        document
          .getElementById("generated_output")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e: any) {
      alert(e?.message ?? "AI failed");
    } finally {
      setBusy("idle");
    }
  }

  const generated_html = React.useMemo(() => {
    return marked.parse(generated_md || "", {
      mangle: false,
      headerIds: false,
    });
  }, [generated_md]);

  async function submit_contact(): Promise<void> {
    if (contact_status === "sending") return;

    const name = contact_name.trim();
    const email = contact_email.trim();
    const message = contact_message.trim();

    if (!name || !email || !message) {
      setContactStatus("error");
      setContactError("Please fill out all fields.");
      return;
    }

    setContactStatus("sending");
    setContactError("");

    try {
      const r = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || data?.message || "Send failed");

      setContactStatus("sent");
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (e: any) {
      setContactStatus("error");
      setContactError(e?.message ?? "Failed to send message.");
    }
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#02030a]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070a1a] via-[#02030a] to-[#000000]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-purple-600/10" />
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute -bottom-64 left-[-200px] w-[900px] h-[900px] rounded-full bg-purple-500/10 blur-[160px]" />
        <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_40%,#000_55%,transparent_100%)]" />
      </div>

      <div dangerouslySetInnerHTML={{ __html: ORIGINAL_HEADER_HTML }} />

      <main>
        <div dangerouslySetInnerHTML={{ __html: ORIGINAL_HOME_HTML }} />

        {/* PLATFORM */}
        <section
          className="py-20 sm:py-28 lg:py-32 border-t border-white/5 max-w-7xl mx-auto px-4 sm:px-6 relative"
          id="try"
        >
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
            {/* TOP LEFT: Transcript panel */}
            <div className="lg:col-span-6">
              <div
                className={class_names(
                  "glass-card flex flex-col overflow-hidden border border-white/10 bg-[#05060b]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl relative",
                  // Mobile: flexible height; Desktop: fixed 760
                  "min-h-[560px] sm:min-h-[640px] lg:h-[760px] lg:max-h-[760px]",
                )}
              >
                <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500/20" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                    <div className="w-2 h-2 rounded-full bg-green-500/20" />
                  </div>

                  <span className="text-[9px] font-bold tracking-[0.2em] text-white/20 uppercase font-mono">
                    Transcript_Live
                  </span>

                  <button
                    className="safe-tap text-white/20 hover:text-red-400 transition-colors p-2 -m-1 rounded-lg"
                    onClick={() => {
                      setTranscript("");
                      setGeneratedMd("");
                    }}
                    title="Clear"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  className="min-h-0 flex-1 p-6 sm:p-10 bg-transparent text-[14px] sm:text-[15px] font-medium leading-relaxed outline-none resize-none overflow-y-auto custom-scrollbar text-white/70"
                  placeholder="// Start speaking or drop a file to begin..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />

                <div className="p-4 sm:p-6 bg-white/[0.01] border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    className={class_names(
                      "safe-tap relative overflow-hidden py-4 sm:py-5 rounded-2xl text-white font-bold text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 group shadow-[0_10px_30px_rgba(37,99,235,0.2)]",
                      busy === "recording"
                        ? "bg-red-600 hover:bg-red-500"
                        : "bg-blue-600 hover:bg-blue-500",
                    )}
                    onClick={() => {
                      if (busy === "recording") stop_recording();
                      else void start_recording();
                    }}
                    disabled={busy !== "idle" && busy !== "recording"}
                    type="button"
                  >
                    <div className="w-2 h-2 bg-white rounded-full group-hover:animate-ping" />
                    {busy === "recording"
                      ? "STOP RECORDING"
                      : "START RECORDING"}
                  </button>

                  <button
                    className="safe-tap py-4 sm:py-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white font-bold text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    onClick={() =>
                      (
                        document.getElementById(
                          "audio-upload",
                        ) as HTMLInputElement | null
                      )?.click()
                    }
                    disabled={busy !== "idle"}
                    type="button"
                  >
                    UPLOAD AUDIO
                  </button>

                  <input
                    id="audio-upload"
                    type="file"
                    className="hidden"
                    accept="audio/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        void on_upload(f).catch((err) =>
                          alert(err?.message ?? "Upload failed"),
                        );
                    }}
                  />
                </div>
              </div>
            </div>

            {/* TOP RIGHT: Config panel */}
            <div className="lg:col-span-6">
              <div
                className={class_names(
                  "glass-card border border-white/10 bg-[#05060b]/40 backdrop-blur-2xl rounded-[2.5rem] relative overflow-hidden flex flex-col shadow-2xl",
                  "p-6 sm:p-10 md:p-14",
                  "min-h-[560px] sm:min-h-[640px] lg:h-[760px] lg:max-h-[760px]",
                )}
              >
                <div className="mb-8 sm:mb-10">
                  <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    Logic Architect
                  </h3>
                  <p className="text-sm text-white/30 mt-3 leading-relaxed max-w-sm">
                    Configure the intelligence layer and processing parameters
                    for your output.
                  </p>
                </div>

                {/* Built-in prompt preset */}
                <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-10">
                  <div className="space-y-3 sm:space-y-4">
                    <label className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase ml-1">
                      Built-in Prompt
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm text-white/70 outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all appearance-none cursor-pointer safe-tap"
                        value={preset_id}
                        onChange={(e) => setPresetId(e.target.value)}
                      >
                        {PROMPT_PRESETS.map((p) => (
                          <option
                            key={p.id}
                            value={p.id}
                            className="bg-[#05060b]"
                          >
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                        ⌄
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <label className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase ml-1">
                      Extra Notes (optional)
                    </label>
                    <input
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm text-white/70 outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all placeholder:text-white/10 safe-tap"
                      placeholder="e.g. Focus only on budget + timeline"
                      type="text"
                      value={extra_notes}
                      onChange={(e) => setExtraNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Existing fields */}
                <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-10">
                  <div className="space-y-3 sm:space-y-4">
                    <label className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase ml-1">
                      Document Type
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm text-white/70 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all appearance-none cursor-pointer safe-tap"
                        value={document_type}
                        onChange={(e) => setDocumentType(e.target.value)}
                      >
                        <option className="bg-[#05060b]">
                          Executive Meeting Minutes
                        </option>
                        <option className="bg-[#05060b]">
                          Project Post-Mortem
                        </option>
                        <option className="bg-[#05060b]">
                          Standard Project Summary
                        </option>
                        <option className="bg-[#05060b]">
                          Step-by-Step Guide
                        </option>
                      </select>
                      <div className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                        ⌄
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <label className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase ml-1">
                      Response Style
                    </label>
                    <input
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm text-white/70 outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-all placeholder:text-white/10 safe-tap"
                      placeholder="e.g. Concise & Technical"
                      type="text"
                      value={response_style}
                      onChange={(e) => setResponseStyle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
                      Special Directives (Template)
                    </label>
                    <span className="text-[8px] font-mono text-cyan-500/40 uppercase">
                      A.I. Tuning
                    </span>
                  </div>

                  <textarea
                    className="min-h-0 flex-1 w-full bg-[#030408]/80 rounded-[2rem] p-6 sm:p-8 text-sm text-white outline-none focus:bg-[#030408]/95 transition-all resize-none leading-relaxed placeholder:text-white/2 overflow-y-auto custom-scrollbar safe-tap"
                    placeholder="Preset template will appear here. You can edit it."
                    value={directives}
                    onChange={(e) => setDirectives(e.target.value)}
                  />
                </div>

                <button
                  className="safe-tap w-full group relative py-5 sm:py-6 rounded-2xl bg-white text-black font-bold tracking-[0.35em] sm:tracking-[0.4em] text-[11px] overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
                  onClick={() => void generate_summary()}
                  disabled={busy !== "idle"}
                  type="button"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex items-center justify-center gap-4 group-hover:text-white transition-all">
                    GENERATE SUMMARY
                  </div>
                </button>
              </div>
            </div>

            {/* BOTTOM: Generated output */}
            {generated_md ? (
              <div className="lg:col-span-12">
                <div
                  id="generated_output"
                  className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] overflow-hidden shadow-2xl"
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                    <span className="text-[9px] font-bold tracking-[0.25em] text-white/30 uppercase">
                      Generated_Output
                    </span>

                    <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
                      <button
                        className="safe-tap px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] tracking-[0.2em] uppercase text-white/70"
                        onClick={() =>
                          download_markdown("salitAI_minutes", generated_md)
                        }
                        type="button"
                      >
                        MD
                      </button>
                      <button
                        className="safe-tap px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] tracking-[0.2em] uppercase text-white/70"
                        onClick={() =>
                          void download_docx("salitAI_minutes", generated_md)
                        }
                        type="button"
                      >
                        DOCX
                      </button>
                      <button
                        className="safe-tap px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] tracking-[0.2em] uppercase text-white/70"
                        onClick={() =>
                          download_pdf("salitAI_minutes", generated_md)
                        }
                        type="button"
                      >
                        PDF
                      </button>
                      <button
                        className="safe-tap px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] tracking-[0.2em] uppercase text-white/70"
                        onClick={() => setGeneratedMd("")}
                        title="Hide output"
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[420px] sm:max-h-[360px] overflow-y-auto custom-scrollbar p-4 sm:p-6">
                    <div
                      className="prose prose-invert max-w-none prose-p:text-white/70 prose-li:text-white/70 prose-strong:text-white"
                      dangerouslySetInnerHTML={{ __html: generated_html }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <div dangerouslySetInnerHTML={{ __html: ORIGINAL_ABOUT_HTML }} />
        <div dangerouslySetInnerHTML={{ __html: ORIGINAL_ENGINE_STRIP_HTML }} />

        {/* Working Contact (React) */}
        <section
          className="py-24 sm:py-32 border-t border-white/5 max-w-6xl mx-auto px-4 sm:px-6 relative overflow-hidden"
          id="contact"
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/[0.07] blur-[120px] rounded-full -z-10" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-10" />

          <div className="text-center mb-14 sm:mb-20 relative">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] font-bold tracking-[0.4em] text-blue-400 uppercase">
                System Gateway Open
              </span>
            </div>
            <h2 className="text-5xl sm:text-7xl font-bold tracking-tighter mb-6">
              Start the{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 bg-clip-text text-transparent">
                Transmission.
              </span>
            </h2>
            <p className="text-white/40 tracking-[0.2em] text-[10px] uppercase max-w-lg mx-auto leading-relaxed font-mono">
              Send a message and we’ll get back to you.
            </p>
          </div>

          <div className="max-w-4xl mx-auto relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-white/10" />
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-white/10" />

            <form
              className="relative z-10 space-y-7 sm:space-y-8 p-7 sm:p-10 md:p-16 border border-white/10 bg-[#030408]/80 backdrop-blur-2xl rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden"
              onSubmit={(e) => {
                e.preventDefault();
                void submit_contact();
              }}
            >
              <div className="grid sm:grid-cols-2 gap-7 sm:gap-10">
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-black tracking-[0.3em] text-white/20 uppercase">
                      01 // Caller_ID
                    </label>
                    <span className="text-[8px] font-mono text-white/10">
                      REQ_FIELD
                    </span>
                  </div>
                  <input
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all placeholder:text-white/10 text-white/80 safe-tap"
                    placeholder="Name or Organization"
                    required
                    value={contact_name}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-black tracking-[0.3em] text-white/20 uppercase">
                      02 // Your_Email
                    </label>
                    <span className="text-[8px] font-mono text-white/10">
                      PROTOCOL_SMTP
                    </span>
                  </div>
                  <input
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all placeholder:text-white/10 text-white/80 safe-tap"
                    placeholder="email@network.com"
                    required
                    type="email"
                    value={contact_email}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end px-1">
                  <label className="text-[10px] font-black tracking-[0.3em] text-white/20 uppercase">
                    03 // Transmission_Payload
                  </label>
                  <span className="text-[8px] font-mono text-white/10">
                    ENC_DATA_STREAM
                  </span>
                </div>
                <textarea
                  className="w-full h-52 sm:h-56 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 text-sm outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-all resize-none font-mono leading-relaxed placeholder:text-white/10 text-white/80 safe-tap"
                  placeholder="Define project scope or mission parameters..."
                  required
                  value={contact_message}
                  onChange={(e) => setContactMessage(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button
                  className="safe-tap w-full group relative overflow-hidden rounded-full bg-white text-black py-5 sm:py-6 font-black tracking-[0.35em] sm:tracking-[0.5em] text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  type="submit"
                  disabled={contact_status === "sending"}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 flex items-center justify-center gap-4 group-hover:text-white transition-colors">
                    {contact_status === "sending"
                      ? "SENDING..."
                      : "INITIATE UPLINK"}
                  </span>
                </button>

                {contact_status === "sent" ? (
                  <div className="mt-4 text-center text-xs text-green-400/90">
                    Message sent successfully.
                  </div>
                ) : null}

                {contact_status === "error" ? (
                  <div className="mt-4 text-center text-xs text-red-400/90">
                    {contact_error || "Failed to send message."}
                  </div>
                ) : null}
              </div>

              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/5 gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">
                      Signal: Secure
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">
                      Latency: 24ms
                    </span>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-white/10 uppercase tracking-[0.3em]">
                  Object_ID: 2026_ORBIT_INTEL
                </div>
              </div>
            </form>
          </div>
        </section>

        <div dangerouslySetInnerHTML={{ __html: ORIGINAL_FOOTER_HTML }} />
      </main>
    </div>
  );
}
