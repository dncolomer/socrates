"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TOPIC_CATALOGUE } from "@/lib/topics";

interface TopicBrowserProps {
  onSelectTopic: (topic: string) => void;
}

const ALL_LABEL = "All";

export function TopicBrowser({ onSelectTopic }: TopicBrowserProps) {
  const [activeFilter, setActiveFilter] = useState(ALL_LABEL);
  const [visibleTopics, setVisibleTopics] = useState<
    { topic: string; category: string; emoji: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const buildTopics = useCallback((filter: string) => {
    const pool: { topic: string; category: string; emoji: string }[] = [];
    for (const cat of TOPIC_CATALOGUE) {
      if (filter !== ALL_LABEL && cat.name !== filter) continue;
      for (const t of cat.topics) {
        pool.push({ topic: t, category: cat.name, emoji: cat.emoji });
      }
    }
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // Show more when filtered to a single category
    return pool.slice(0, filter === ALL_LABEL ? 12 : 20);
  }, []);

  useEffect(() => {
    setVisibleTopics(buildTopics(activeFilter));
  }, [activeFilter, buildTopics]);

  const handleReshuffle = () => {
    setVisibleTopics(buildTopics(activeFilter));
  };

  const handleFilterClick = (name: string) => {
    setActiveFilter(name);
    // Scroll filter into view
    scrollRef.current?.querySelector(`[data-filter="${name}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-neutral-500">
          Not sure where to start? Pick one of these.
        </p>
        <button
          onClick={handleReshuffle}
          className="text-xs text-neutral-600 hover:text-white transition-colors inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-neutral-800"
        >
          <ShuffleIcon />
          Shuffle
        </button>
      </div>

      {/* Category filter strip */}
      <div ref={scrollRef} className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          data-filter={ALL_LABEL}
          onClick={() => handleFilterClick(ALL_LABEL)}
          className={`shrink-0 px-3 py-1.5 text-xs rounded-full border transition-colors ${
            activeFilter === ALL_LABEL
              ? "bg-white text-black border-white"
              : "text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-white"
          }`}
        >
          All
        </button>
        {TOPIC_CATALOGUE.map((cat) => (
          <button
            key={cat.name}
            data-filter={cat.name}
            onClick={() => handleFilterClick(cat.name)}
            className={`shrink-0 px-3 py-1.5 text-xs rounded-full border transition-colors inline-flex items-center gap-1.5 ${
              activeFilter === cat.name
                ? "bg-white text-black border-white"
                : "text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-white"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Topic cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {visibleTopics.map(({ topic, category, emoji }) => (
          <button
            key={topic}
            onClick={() => onSelectTopic(topic)}
            className="group text-left p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/80 hover:border-neutral-600 transition-all duration-200"
          >
            <p className="text-[13px] text-neutral-300 group-hover:text-white leading-snug mb-2.5">
              {topic}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{emoji}</span>
              <span className="text-[11px] text-neutral-600 group-hover:text-neutral-400 transition-colors">
                {category}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShuffleIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
