import { HeartPulse, MoonStar, Sparkles, Wind } from 'lucide-react';

interface QuickHelpCardsProps {
  onSelectPrompt: (prompt: string) => void;
}

const quickHelpItems = [
  {
    label: 'I feel anxious',
    prompt: 'I feel anxious right now. Please guide me through a short calming exercise.',
    icon: Wind,
    style: 'from-cyan-500 to-blue-500',
  },
  {
    label: "I can't sleep",
    prompt: "I can't sleep tonight. Can you help me with a gentle wind-down routine?",
    icon: MoonStar,
    style: 'from-indigo-500 to-violet-500',
  },
  {
    label: "I'm overthinking",
    prompt: 'I am overthinking and feeling mentally exhausted. Help me ground myself.',
    icon: HeartPulse,
    style: 'from-emerald-500 to-teal-500',
  },
  {
    label: 'I need motivation',
    prompt: 'I need motivation to keep going today. Please encourage me in a kind way.',
    icon: Sparkles,
    style: 'from-sky-500 to-cyan-500',
  },
];

export function QuickHelpCards({ onSelectPrompt }: QuickHelpCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {quickHelpItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className={`group rounded-lg bg-gradient-to-r ${item.style} p-px text-left transition hover:scale-[1.02]`}
          >
            <div className="rounded-lg bg-white/95 px-3 py-2">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Icon size={14} />
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Quick support prompt</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
