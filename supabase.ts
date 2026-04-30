@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-manrope: "Manrope", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-shimmer {
  background: linear-gradient(90deg, transparent 25%, rgba(148, 163, 184, 0.15) 50%, transparent 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}

@layer base {
  body {
    @apply bg-gray-50 text-slate-900;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
}

/* Custom Scrollbar */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  overflow-anchor: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

html {
  scroll-behavior: smooth;
}

::-webkit-scrollbar {
  width: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #f1f1f1;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #e5e5e5;
}

/* Markdown Styles */
.markdown-body {
  @apply text-[15px] leading-relaxed text-slate-700 font-sans;
}

.markdown-body p {
  @apply mb-4 last:mb-0;
}

.markdown-body strong {
  @apply font-semibold text-slate-800;
}

.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  @apply font-bold text-slate-900 mt-6 mb-3 tracking-tight;
}

.markdown-body h1 { @apply text-2xl; }
.markdown-body h2 { @apply text-xl; }
.markdown-body h3 { @apply text-lg; }

.markdown-body ul {
  @apply mb-4 pl-6 list-disc space-y-2;
}

.markdown-body ol {
  @apply mb-4 pl-6 list-decimal space-y-2;
}

.markdown-body li {
  @apply mb-1;
}

.markdown-body blockquote {
  @apply border-l-4 border-slate-200 pl-4 italic text-slate-500 mb-4 bg-slate-50 py-1;
}

.katex-display {
  @apply overflow-x-auto overflow-y-hidden py-4 my-4 bg-slate-50/50 rounded-lg border border-slate-100;
}

.katex {
  @apply text-[1.1em];
}

.markdown-body pre {
  @apply rounded-xl my-5 text-[13px] bg-slate-900 border border-slate-800 shadow-xl !p-5 overflow-x-auto;
}

.markdown-body code {
  @apply font-mono bg-slate-100/80 text-emerald-700 px-1.5 py-0.5 rounded text-[13px] border border-slate-200/50;
}

.markdown-body table {
  @apply min-w-full border-collapse mb-4 border border-slate-100 rounded-lg overflow-hidden text-xs;
}

.markdown-body th, .markdown-body td {
  @apply border border-slate-100 p-2 text-left;
}

.markdown-body th {
  @apply bg-slate-50 font-bold text-slate-600;
}
