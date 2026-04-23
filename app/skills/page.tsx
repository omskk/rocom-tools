'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';

// Types
interface Learner {
  creatureId: string;
  creatureName: string;
  displayName: string;
}

interface Skill {
  skillId: string;
  skillNumber: number;
  name: string;
  attribute: string;
  category: string;
  icon: string;
  energyCost: number;
  power: number;
  effect: string;
  learnerCount: number;
  resolvedLearnerCount: number;
  unmatchedLearnerCount: number;
  learners: Learner[];
}

interface SkillsData {
  skills: any[];
}

// Constants
const ATTRIBUTE_LABEL_MAP: Record<string, string> = {
  normal: '普通',
  grass: '草',
  fire: '火',
  water: '水',
  light: '光',
  earth: '地',
  ice: '冰',
  dragon: '龙',
  electric: '电',
  poison: '毒',
  bug: '虫',
  martial: '武',
  wing: '翼',
  cute: '萌',
  ghost: '幽',
  evil: '恶',
  machine: '机械',
  illusion: '幻',
  rock: '石',
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  physical: '物攻',
  magical: '魔攻',
  status: '状态',
};

const ATTRIBUTE_ORDER_MAP: Record<string, number> = {
  normal: 0,
  grass: 1,
  fire: 2,
  water: 3,
  light: 4,
  earth: 5,
  ice: 6,
  dragon: 7,
  electric: 8,
  poison: 9,
  bug: 10,
  martial: 11,
  wing: 12,
  cute: 13,
  ghost: 14,
  evil: 15,
  machine: 16,
  illusion: 17,
  rock: 18,
};

const LEARNER_COUNT_OPTIONS = [
  { label: '全部数量', value: '' },
  { label: '1-5 只', value: 'few' },
  { label: '6-15 只', value: 'medium' },
  { label: '16-30 只', value: 'many' },
  { label: '31 只及以上', value: 'massive' },
];

// Utilities
function getAttributeLabel(value: string): string {
  const text = String(value || '').trim();
  return ATTRIBUTE_LABEL_MAP[text] || text || '未知';
}

function getCategoryLabel(value: string): string {
  const text = String(value || '').trim();
  return CATEGORY_LABEL_MAP[text] || text || '未知';
}

function toSkillNumber(skillId: string): number {
  const match = String(skillId || '').match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function normalizeSkill(rawItem: any): Skill {
  const learners = Array.isArray(rawItem?.learners) ? rawItem.learners : [];
  const resolvedLearnerCount = Number(rawItem?.resolvedLearnerCount ?? 0);
  const learnerCount = Number(rawItem?.learnerCount ?? learners.length);
  const unmatchedLearnerCount = Number(rawItem?.unmatchedLearnerCount ?? 0);

  return {
    skillId: String(rawItem?.skillId || ''),
    skillNumber: toSkillNumber(rawItem?.skillId),
    name: String(rawItem?.name || '未命名技能'),
    attribute: String(rawItem?.attribute || ''),
    category: String(rawItem?.category || ''),
    icon: String(rawItem?.icon || ''),
    energyCost: Number(rawItem?.energyCost ?? 0),
    power: Number(rawItem?.power ?? 0),
    effect: String(rawItem?.effect || ''),
    learnerCount,
    resolvedLearnerCount,
    unmatchedLearnerCount,
    learners,
  };
}

function matchLearnerCountMode(count: number, mode: string): boolean {
  if (!mode) return true;
  if (mode === 'few') return count >= 1 && count <= 5;
  if (mode === 'medium') return count >= 6 && count <= 15;
  if (mode === 'many') return count >= 16 && count <= 30;
  if (mode === 'massive') return count >= 31;
  return true;
}

// UI Components
function SearchInput({
  value,
  onChange,
  onApply,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onApply()}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
      <button
        onClick={onApply}
        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
      >
        搜索
      </button>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '20px',
        paddingRight: '40px',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function SkillsPage() {
  // State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [learnerCountMode, setLearnerCountMode] = useState('');

  // Computed
  const attributeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of skills) {
      const value = String(item.attribute || '').trim();
      if (value) set.add(value);
    }
    return [...set].sort((a, b) => {
      const orderA = ATTRIBUTE_ORDER_MAP[a] ?? Number.MAX_SAFE_INTEGER;
      const orderB = ATTRIBUTE_ORDER_MAP[b] ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return getAttributeLabel(a).localeCompare(getAttributeLabel(b), 'zh-CN');
    });
  }, [skills]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of skills) {
      const value = String(item.category || '').trim();
      if (value) set.add(value);
    }
    return [...set].sort((a, b) =>
      getCategoryLabel(a).localeCompare(getCategoryLabel(b), 'zh-CN')
    );
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    const attribute = selectedAttribute;
    const category = selectedCategory;
    const countMode = learnerCountMode;

    return skills.filter((item) => {
      const keywordMatched =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.skillId.toLowerCase().includes(keyword) ||
        item.effect.toLowerCase().includes(keyword) ||
        item.learners.some((learner) =>
          String(learner?.displayName || '').toLowerCase().includes(keyword)
        );
      const attributeMatched = !attribute || item.attribute === attribute;
      const categoryMatched = !category || item.category === category;
      const learnerCountMatched = matchLearnerCountMode(
        item.resolvedLearnerCount,
        countMode
      );

      return (
        keywordMatched &&
        attributeMatched &&
        categoryMatched &&
        learnerCountMatched
      );
    });
  }, [skills, searchKeyword, selectedAttribute, selectedCategory, learnerCountMode]);

  // Actions
  const applySearch = useCallback(() => {
    setSearchKeyword(String(searchDraft || '').trim());
  }, [searchDraft]);

  const resetFilters = useCallback(() => {
    setSearchDraft('');
    setSearchKeyword('');
    setSelectedAttribute('');
    setSelectedCategory('');
    setLearnerCountMode('');
  }, []);

  // Load data
  useEffect(() => {
    async function loadSkills() {
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch('/data/skills-master-list.json', {
          cache: 'no-cache',
        });
        if (!response.ok) {
          throw new Error(`技能图鉴数据加载失败：${response.status}`);
        }
        const data: SkillsData = await response.json();
        const list = Array.isArray(data?.skills) ? data.skills : [];
        setSkills(
          list
            .map((item) => normalizeSkill(item))
            .sort((a, b) => {
              if (a.skillNumber !== b.skillNumber) {
                return a.skillNumber - b.skillNumber;
              }
              return a.name.localeCompare(b.name, 'zh-CN');
            })
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : '技能图鉴数据加载失败'
        );
        setSkills([]);
      } finally {
        setLoading(false);
      }
    }
    loadSkills();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="w-full max-w-6xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-4 py-2 bg-white/70 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">返回首页</span>
          </Link>
        </div>

        {/* Filter Section */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">技能图鉴</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                搜索
              </label>
              <SearchInput
                value={searchDraft}
                onChange={setSearchDraft}
                onApply={applySearch}
                placeholder="输入技能名称、编号、效果或精灵名称"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                属性
              </label>
              <Select
                value={selectedAttribute}
                onChange={setSelectedAttribute}
                placeholder="全部属性"
                options={attributeOptions.map((attr) => ({
                  label: getAttributeLabel(attr),
                  value: attr,
                }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                分类
              </label>
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder="全部分类"
                options={categoryOptions.map((cat) => ({
                  label: getCategoryLabel(cat),
                  value: cat,
                }))}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide">
                学习精灵数
              </label>
              <Select
                value={learnerCountMode}
                onChange={setLearnerCountMode}
                placeholder="全部数量"
                options={LEARNER_COUNT_OPTIONS.filter((o) => o.value !== '').map((o) => ({
                  label: o.label,
                  value: o.value,
                }))}
              />
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg">
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {errorMessage}
            </div>
          )}

          {loading && (
            <div className="py-12 text-center text-gray-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>加载中...</p>
            </div>
          )}

          {!loading && !errorMessage && filteredSkills.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <p className="text-lg">没有符合条件的技能内容</p>
            </div>
          )}

          {!loading && filteredSkills.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredSkills.map((item) => (
                <Link
                  key={item.skillId}
                  href={`/skills/${item.skillId}`}
                  className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-3 cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center">
                    {item.icon ? (
                      <img
                        src={`/skill-icons/${item.icon}`}
                        alt={`${item.name} 图标`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 text-center">技能图标</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 text-center line-clamp-1">
                    {item.name}
                  </h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                      {getAttributeLabel(item.attribute)}
                    </span>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      {getCategoryLabel(item.category)}
                    </span>
                  </div>
                    {item.resolvedLearnerCount > 0 && (
                      <div className="text-xs text-gray-500">
                        可学习: {item.resolvedLearnerCount} 只
                      </div>
                    )}
                </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
