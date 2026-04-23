'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface Creature {
  id: string;
  name: string;
  attributes?: string[];
  images?: {
    default?: string;
    base?: string;
    forms?: Record<string, string>;
    bossForms?: Record<string, string>;
    bossFormVariants?: Record<string, Record<string, string>>;
  };
}

interface AtlasEntry {
  key: string;
  formKey: string;
  id: string;
  idNumber: number;
  baseName: string;
  name: string;
  attributes: string[];
  imageUrl: string;
  imageAlt: string;
  formType: 'normal' | 'region' | 'boss';
  sortOrder: number;
}

interface MasterData {
  creatures: Creature[];
}

interface EvolutionData {
  chains: Array<{
    group: string;
    members: string[];
  }>;
}

// Constants
const FORM_TYPE_OPTIONS = [
  { label: '全部形态', value: '' },
  { label: '普通形态', value: 'normal' },
  { label: '地区形态', value: 'region' },
  { label: '首领形态', value: 'boss' },
] as const;

const NORMAL_FORM_PATTERNS: Record<string, string[]> = {
  // 普通形态关键词列表
  '默认': ['默认'],
  '原始形态': ['原始形态'],
};

// Utilities
function toIdNumber(id: string): number {
  const value = Number(id);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function toImageUrl(fileName: string): string {
  if (!fileName) return '';
  return `/creature-atlas/${fileName}`;
}

function isAtlasNormalForm(baseName: string, label: string): boolean {
  const text = label.trim();
  if (!text) return false;

  const patterns = NORMAL_FORM_PATTERNS[baseName] || [];
  return patterns.some((p) => text.includes(p));
}

function buildAtlasEntries(entry: Creature): AtlasEntry[] {
  const id = String(entry?.id || '');
  const idNumber = toIdNumber(id);
  const baseName = String(entry?.name || '未命名精灵');
  const attributes = Array.isArray(entry?.attributes) ? entry.attributes : [];
  const images = entry?.images || {};
  const defaultFile = images.default || images.base || '';
  const baseFile = images.base || '';
  const formsMap = images.forms || {};
  const bossFormsMap = images.bossForms || {};
  const bossFormVariantsMap = images.bossFormVariants || {};

  const result: AtlasEntry[] = [];
  const usedKeys = new Set<string>();
  let orderIndex = 0;

  const formEntries = Object.entries(formsMap).filter(([, fileName]) => fileName);
  const shouldShowBaseCard = formEntries.length === 0 ||
    !formEntries.some(([label]) => isAtlasNormalForm(baseName, label));

  function pushEntry(
    name: string,
    fileName: string,
    suffix: string,
    formType: 'normal' | 'region' | 'boss' = 'normal',
    formKey = 'default'
  ) {
    if (!fileName) return;
    const key = `${id}:${suffix}:${fileName}:${name}`;
    if (usedKeys.has(key)) return;
    usedKeys.add(key);
    result.push({
      key,
      formKey,
      id,
      idNumber,
      baseName,
      name,
      attributes,
      imageUrl: toImageUrl(fileName),
      imageAlt: `${name} 图像`,
      formType,
      sortOrder: orderIndex++,
    });
  }

  if (shouldShowBaseCard) {
    pushEntry(baseName, defaultFile || baseFile, 'base', 'normal', 'default');
  }

  formEntries.forEach(([label, fileName]) => {
    const formType = isAtlasNormalForm(baseName, label) ? 'normal' : 'region';
    pushEntry(
      `${baseName}·${label}`,
      fileName,
      `form:${label}`,
      formType,
      `form:${label}`
    );
  });

  Object.entries(bossFormsMap)
    .filter(([, fileName]) => fileName)
    .forEach(([label, fileName]) => {
      pushEntry(label, fileName, `boss:${label}`, 'boss', `boss:${label}`);
    });

  Object.entries(bossFormVariantsMap).forEach(([bossLabel, variantMap]) => {
    Object.entries(variantMap || {})
      .filter(([, fileName]) => fileName)
      .forEach(([variantLabel, fileName]) => {
        pushEntry(
          `${bossLabel}·${variantLabel}`,
          fileName,
          `boss-variant:${bossLabel}:${variantLabel}`,
          'boss',
          `boss-variant:${bossLabel}:${variantLabel}`
        );
      });
  });

  return result;
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

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

export default function AtlasPage() {
  // State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [selectedFormType, setSelectedFormType] = useState('');
  const [shinyOnly, setShinyOnly] = useState(false);

  // Computed
  const attributeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const creature of creatures) {
      const attributes = Array.isArray(creature?.attributes) ? creature.attributes : [];
      for (const attribute of attributes) {
        const value = String(attribute || '').trim();
        if (value) set.add(value);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [creatures]);

  const atlasEntries = useMemo(() => {
    return creatures
      .flatMap((item) => buildAtlasEntries(item))
      .sort((a, b) => {
        if (a.idNumber !== b.idNumber) return a.idNumber - b.idNumber;
        const rankMap: Record<string, number> = { normal: 0, region: 1, boss: 2 };
        const rankA = rankMap[a.formType] ?? 99;
        const rankB = rankMap[b.formType] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [creatures]);

  const filteredEntries = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    const attribute = selectedAttribute;
    const formType = selectedFormType;

    return atlasEntries.filter((entry) => {
      const keywordMatched =
        !keyword ||
        entry.name.toLowerCase().includes(keyword) ||
        entry.id.toLowerCase().includes(keyword);
      const attributeMatched =
        !attribute || entry.attributes.includes(attribute);
      const formMatched = !formType || entry.formType === formType;
      return keywordMatched && attributeMatched && formMatched;
    });
  }, [atlasEntries, searchKeyword, selectedAttribute, selectedFormType]);

  // Actions
  const applySearch = useCallback(() => {
    setSearchKeyword(String(searchDraft || '').trim());
  }, [searchDraft]);

  const resetFilters = useCallback(() => {
    setSearchDraft('');
    setSearchKeyword('');
    setSelectedAttribute('');
    setSelectedFormType('');
    setShinyOnly(false);
  }, []);

  // Load data
  useEffect(() => {
    async function loadCreatures() {
      setLoading(true);
      setErrorMessage('');
      try {
        const [masterResponse, evoResponse] = await Promise.all([
          fetch('/data/creatures-master-list.json', { cache: 'no-cache' }),
          fetch('/data/evolution-chains.json', { cache: 'no-cache' }),
        ]);
        if (!masterResponse.ok) {
          throw new Error(`图鉴数据加载失败：${masterResponse.status}`);
        }
        const masterData: MasterData = await masterResponse.json();
        setCreatures(Array.isArray(masterData?.creatures) ? masterData.creatures : []);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '图鉴数据加载失败');
        setCreatures([]);
      } finally {
        setLoading(false);
      }
    }
    loadCreatures();
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
          <h1 className="text-2xl font-bold text-gray-800 mb-6">精灵图鉴</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                搜索
              </label>
              <SearchInput
                value={searchDraft}
                onChange={setSearchDraft}
                onApply={applySearch}
                placeholder="输入精灵名称或 ID"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                系别
              </label>
              <Select
                value={selectedAttribute}
                onChange={setSelectedAttribute}
                placeholder="全部系别"
                options={attributeOptions.map((attr) => ({ label: `${attr}系`, value: attr }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                形态
              </label>
              <Select
                value={selectedFormType}
                onChange={setSelectedFormType}
                placeholder="全部形态"
                options={FORM_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => ({ label: o.label, value: o.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Switch checked={shinyOnly} onChange={setShinyOnly} label="只显示异色" />
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

          {!loading && !errorMessage && filteredEntries.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <p className="text-lg">没有符合条件的图鉴内容</p>
            </div>
          )}

          {!loading && filteredEntries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredEntries.map((entry) => (
                  <Link
                    key={entry.key}
                    href={`/atlas/${entry.id}${entry.formKey && entry.formKey !== 'default' ? `?form=${entry.formKey}` : ''}`}
                    className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-2 cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      #{entry.id}
                    </div>
                    <div className="w-full aspect-square flex items-center justify-center bg-gray-50 rounded-xl p-2">
                      {entry.imageUrl ? (
                        <img
                          src={entry.imageUrl}
                          alt={entry.imageAlt}
                          className="w-full max-w-[80px] h-auto object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">暂无图片</span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 text-center word-break">
                      {entry.name}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-1">
                      {entry.attributes.length > 0 ? (
                        entry.attributes.map((attr) => (
                          <span
                            key={`${entry.key}-${attr}`}
                            className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full"
                          >
                            {attr}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          未知属性
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
