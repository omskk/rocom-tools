'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// ============== 类型定义 ==============
interface Creature {
  id: string;
  name: string;
  attributes: string[];
  trait: {
    name: string;
    description: string;
  };
  images: {
    default: string;
    base: string;
    forms: Record<string, string>;
    bossForms: Record<string, string>;
    bossFormVariants: Record<string, Record<string, string>>;
  };
  raceStats: {
    default: Stats | null;
    forms: Record<string, Stats>;
    bossForms: Record<string, Stats>;
    bossFormVariants: Record<string, Record<string, Stats>>;
  };
}

interface Stats {
  total: number;
  hp: number;
  physicalAttack: number;
  magicalAttack: number;
  physicalDefense: number;
  magicalDefense: number;
  speed: number;
}

interface StatItem {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
}

interface FormOption {
  key: string;
  title: string;
  fileName: string;
  type: 'default' | 'form' | 'boss' | 'boss-variant';
  stats: Stats | null;
}

interface Skill {
  skillId: string;
  name: string;
  attribute: string;
  category: string;
  icon: string;
  energyCost: number;
  power: number;
  effect: string;
}

interface LearnsetEntry {
  creatureId: string;
  default: string[];
  forms: Record<string, string[]>;
  bossForms: Record<string, string[]>;
  bossFormVariants: Record<string, Record<string, string[]>>;
}

interface EvolutionItem {
  id: string;
  name: string;
  forms: { key: string; name: string; type: string }[];
}

// ============== 常量 ==============
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

// ============== 工具函数 ==============
function toImageUrl(fileName: string): string {
  return fileName ? `/creature-atlas/${fileName}` : '';
}

function toSkillIconUrl(fileName: string): string {
  return fileName ? `/skill-icons/${fileName}` : '';
}

function getAttributeLabel(value: string): string {
  return ATTRIBUTE_LABEL_MAP[value] || value || '未知';
}

function normalizeStats(rawStats: unknown): Stats | null {
  if (!rawStats || typeof rawStats !== 'object') return null;
  const stats = rawStats as Record<string, unknown>;
  return {
    total: Number(stats.total ?? 0),
    hp: Number(stats.hp ?? 0),
    physicalAttack: Number(stats.physicalAttack ?? 0),
    magicalAttack: Number(stats.magicalAttack ?? 0),
    physicalDefense: Number(stats.physicalDefense ?? 0),
    magicalDefense: Number(stats.magicalDefense ?? 0),
    speed: Number(stats.speed ?? 0),
  };
}

function toStatItems(stats: Stats): StatItem[] {
  return [
    { key: 'total', label: '基础数值', value: stats.total, highlight: true },
    { key: 'hp', label: '生命', value: stats.hp },
    { key: 'physicalAttack', label: '物攻', value: stats.physicalAttack },
    { key: 'magicalAttack', label: '魔攻', value: stats.magicalAttack },
    { key: 'physicalDefense', label: '物防', value: stats.physicalDefense },
    { key: 'magicalDefense', label: '魔防', value: stats.magicalDefense },
    { key: 'speed', label: '速度', value: stats.speed },
  ];
}

function normalizeCreature(rawItem: unknown): Creature | null {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const item = rawItem as Record<string, unknown>;
  return {
    id: String(item.id || '').trim(),
    name: String(item.name || '未命名精灵'),
    attributes: Array.isArray(item.attributes)
      ? item.attributes.map((a) => String(a || '').trim()).filter(Boolean)
      : [],
    trait: {
      name: String((item.trait as Record<string, unknown>)?.name || '').trim(),
      description: String((item.trait as Record<string, unknown>)?.description || '').trim(),
    },
    images: {
      default: String((item.images as Record<string, unknown>)?.default || '').trim(),
      base: String((item.images as Record<string, unknown>)?.base || '').trim(),
      forms: (item.images as Record<string, unknown>)?.forms as Record<string, string> || {},
      bossForms: (item.images as Record<string, unknown>)?.bossForms as Record<string, string> || {},
      bossFormVariants: (item.images as Record<string, unknown>)?.bossFormVariants as Record<string, Record<string, string>> || {},
    },
    raceStats: {
      default: normalizeStats((item.raceStats as Record<string, unknown>)?.default),
      forms: (item.raceStats as Record<string, unknown>)?.forms as Record<string, Stats> || {},
      bossForms: (item.raceStats as Record<string, unknown>)?.bossForms as Record<string, Stats> || {},
      bossFormVariants: (item.raceStats as Record<string, unknown>)?.bossFormVariants as Record<string, Record<string, Stats>> || {},
    },
  };
}

function normalizeSkill(rawItem: unknown): Skill | null {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const item = rawItem as Record<string, unknown>;
  return {
    skillId: String(item.skillId || '').trim(),
    name: String(item.name || '未命名技能').trim(),
    attribute: String(item.attribute || '').trim(),
    category: String(item.category || '').trim(),
    icon: String(item.icon || '').trim(),
    energyCost: Number(item.energyCost ?? 0),
    power: Number(item.power ?? 0),
    effect: String(item.effect || '').trim(),
  };
}

function normalizeLearnset(rawItem: unknown): LearnsetEntry | null {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const item = rawItem as Record<string, unknown>;
  return {
    creatureId: String(item.creatureId || '').trim(),
    default: Array.isArray(item.default) ? item.default : [],
    forms: (item.forms as Record<string, string[]>) || {},
    bossForms: (item.bossForms as Record<string, string[]>) || {},
    bossFormVariants: (item.bossFormVariants as Record<string, Record<string, string[]>>) || {},
  };
}

function parseFormKey(rawKey: string) {
  const key = String(rawKey || 'default').trim() || 'default';
  if (key === 'default') {
    return { raw: 'default', type: 'default', label: '', bossLabel: '', variantLabel: '' };
  }
  if (key.startsWith('form:')) {
    return { raw: key, type: 'form', label: key.slice(5).trim(), bossLabel: '', variantLabel: '' };
  }
  if (key.startsWith('boss:')) {
    return { raw: key, type: 'boss', label: key.slice(5).trim(), bossLabel: '', variantLabel: '' };
  }
  if (key.startsWith('boss-variant:')) {
    const rest = key.slice(13);
    const separatorIndex = rest.indexOf(':');
    const bossLabel = separatorIndex >= 0 ? rest.slice(0, separatorIndex).trim() : '';
    const variantLabel = separatorIndex >= 0 ? rest.slice(separatorIndex + 1).trim() : rest.trim();
    return { raw: key, type: 'boss-variant', label: variantLabel, bossLabel, variantLabel };
  }
  return { raw: key, type: 'unknown', label: key, bossLabel: '', variantLabel: '' };
}

// ============== 主页面 ==============
export default function CreatureDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [creature, setCreature] = useState<Creature | null>(null);
  const [creatureMap, setCreatureMap] = useState<Map<string, Creature>>(new Map());
  const [evolutionChains, setEvolutionChains] = useState<EvolutionItem[][]>([]);
  const [learnsetEntry, setLearnsetEntry] = useState<LearnsetEntry | null>(null);
  const [skillMap, setSkillMap] = useState<Map<string, Skill>>(new Map());
  const [selectedFormKey, setSelectedFormKey] = useState('');

  const creatureId = params.id as string;

  // 加载数据
  useEffect(() => {
    async function loadCreatureDetail() {
      setLoading(true);
      setErrorMessage('');

      try {
        if (!creatureId) {
          throw new Error('缺少精灵编号');
        }

        const [creatureRes, evolutionRes, learnsetRes, skillRes] = await Promise.all([
          fetch('/data/creatures-master-list.json', { cache: 'no-cache' }),
          fetch('/data/evolution-chains.json', { cache: 'no-cache' }),
          fetch('/data/creature-skill-learnsets.json', { cache: 'no-cache' }),
          fetch('/data/skills-master-list.json', { cache: 'no-cache' }),
        ]);

        if (!creatureRes.ok) throw new Error(`精灵数据加载失败：${creatureRes.status}`);
        if (!evolutionRes.ok) throw new Error(`进化链数据加载失败：${evolutionRes.status}`);
        if (!learnsetRes.ok) throw new Error(`技能学习数据加载失败：${learnsetRes.status}`);
        if (!skillRes.ok) throw new Error(`技能数据加载失败：${skillRes.status}`);

        const creatureData = await creatureRes.json();
        const evolutionData = await evolutionRes.json();
        const learnsetData = await learnsetRes.json();
        const skillData = await skillRes.json();

        // 处理精灵数据
        const creatures = Array.isArray(creatureData?.creatures) ? creatureData.creatures : [];
        const creatureMapData = new Map<string, Creature>();
        creatures.forEach((item: unknown) => {
          const creature = normalizeCreature(item);
          if (creature?.id) {
            creatureMapData.set(creature.id, creature);
          }
        });
        setCreatureMap(creatureMapData);

        const matchedCreature = creatures.find((item: { id?: string }) => String(item?.id || '').trim() === creatureId);
        if (!matchedCreature) {
          throw new Error(`未找到编号为 ${creatureId} 的精灵`);
        }
        setCreature(normalizeCreature(matchedCreature));

        // 处理进化链
        setEvolutionChains(Array.isArray(evolutionData?.chains) ? evolutionData.chains : []);

        // 处理技能学习表
        const learnsets = Array.isArray(learnsetData?.creatures) ? learnsetData.creatures : [];
        const matchedLearnset = learnsets.find((item: { creatureId?: string }) =>
          String(item?.creatureId || '').trim() === creatureId
        );
        setLearnsetEntry(matchedLearnset ? normalizeLearnset(matchedLearnset) : null);

        // 处理技能数据
        const skills = Array.isArray(skillData?.skills) ? skillData.skills : [];
        const skillMapData = new Map<string, Skill>();
        skills.forEach((item: unknown) => {
          const skill = normalizeSkill(item);
          if (skill?.skillId) {
            skillMapData.set(skill.skillId, skill);
          }
        });
        setSkillMap(skillMapData);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '精灵详情数据加载失败');
      } finally {
        setLoading(false);
      }
    }

    loadCreatureDetail();
  }, [creatureId]);

  // 表单选项
  const formOptions = useMemo<FormOption[]>(() => {
    if (!creature) return [];
    const result: FormOption[] = [];
    const { images, raceStats } = creature;

    // 基础形态
    const baseFile = images.default || images.base;
    if (baseFile) {
      result.push({
        key: 'default',
        title: '基础形态',
        fileName: baseFile,
        type: 'default',
        stats: raceStats.default,
      });
    }

    // 其他形态
    Object.entries(images.forms || {}).forEach(([label, fileName]) => {
      if (fileName) {
        result.push({
          key: `form:${label}`,
          title: label,
          fileName,
          type: 'form',
          stats: normalizeStats(raceStats.forms?.[label]),
        });
      }
    });

    // Boss形态
    Object.entries(images.bossForms || {}).forEach(([label, fileName]) => {
      if (fileName) {
        result.push({
          key: `boss:${label}`,
          title: label,
          fileName,
          type: 'boss',
          stats: normalizeStats(raceStats.bossForms?.[label]),
        });
      }
    });

    // Boss变体形态
    Object.entries(images.bossFormVariants || {}).forEach(([bossLabel, variantMap]) => {
      Object.entries(variantMap || {}).forEach(([variantLabel, fileName]) => {
        if (fileName) {
          result.push({
            key: `boss-variant:${bossLabel}:${variantLabel}`,
            title: `${bossLabel} · ${variantLabel}`,
            fileName,
            type: 'boss-variant',
            stats: normalizeStats(raceStats.bossFormVariants?.[bossLabel]?.[variantLabel]),
          });
        }
      });
    });

    return result;
  }, [creature]);

  // 同步选中的形态
  useEffect(() => {
    if (!formOptions.length) {
      setSelectedFormKey('');
      return;
    }
    const routeFormKey = searchParams.get('form') || '';
    const matched = formOptions.find((item) => item.key === routeFormKey);
    setSelectedFormKey(matched?.key || formOptions[0]?.key || '');
  }, [formOptions, searchParams]);

  // 当前形态
  const currentForm = useMemo(() => {
    if (!formOptions.length) return null;
    return formOptions.find((item) => item.key === selectedFormKey) || formOptions[0];
  }, [formOptions, selectedFormKey]);

  // 当前显示名称
  const currentDisplayName = useMemo(() => {
    if (!creature) return '';
    if (!currentForm) return creature.name;
    if (currentForm.type === 'default') return creature.name;
    return `${creature.name}·${currentForm.title}`;
  }, [creature, currentForm]);

  // 当前种族值
  const currentStatItems = useMemo(() => {
    if (!currentForm?.stats) return [];
    return toStatItems(currentForm.stats);
  }, [currentForm]);

  // 获取当前技能ID列表
  function getCurrentSkillIds(): string[] {
    if (!learnsetEntry) return [];
    const selectedKey = currentForm?.key || 'default';
    const parsed = parseFormKey(selectedKey);

    if (parsed.type === 'form') {
      const formSkills = learnsetEntry.forms?.[parsed.label];
      if (Array.isArray(formSkills) && formSkills.length) return formSkills;
    }
    if (parsed.type === 'boss') {
      const bossSkills = learnsetEntry.bossForms?.[parsed.label];
      if (Array.isArray(bossSkills) && bossSkills.length) return bossSkills;
    }
    if (parsed.type === 'boss-variant') {
      const variantSkills = learnsetEntry.bossFormVariants?.[parsed.bossLabel]?.[parsed.variantLabel];
      if (Array.isArray(variantSkills) && variantSkills.length) return variantSkills;
      const bossSkills = learnsetEntry.bossForms?.[parsed.bossLabel];
      if (Array.isArray(bossSkills) && bossSkills.length) return bossSkills;
    }
    return Array.isArray(learnsetEntry.default) ? learnsetEntry.default : [];
  }

  // 技能列表
  const skillSectionList = useMemo(() => {
    if (!learnsetEntry) return [];
    const skills = getCurrentSkillIds()
      .map((skillId) => skillMap.get(skillId))
      .filter(Boolean) as Skill[];
    if (!skills.length) return [];
    return [{
      key: currentForm?.key || 'default',
      title: currentDisplayName || '当前形态',
      skills,
    }];
  }, [learnsetEntry, skillMap, currentForm, currentDisplayName]);

  // 选择形态
  function selectForm(key: string) {
    if (!key || key === selectedFormKey) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('form', key);
    router.replace(`?${params.toString()}`);
    setSelectedFormKey(key);
  }

  // 特性名称和描述
  const traitName = creature?.trait?.name?.trim() || '暂无特性';
  const traitDescription = creature?.trait?.description?.trim() || '暂无特性说明';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="text-red-600 font-medium">⚠️ {errorMessage}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!creature) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500">
            未找到精灵数据
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <Link
          href="/atlas"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回图鉴
        </Link>

        {/* 基本信息卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：图片和形态切换 */}
            <div className="space-y-4">
              {/* 主图 */}
              <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border border-blue-100 p-6 flex items-center justify-center">
                {currentForm?.fileName ? (
                  <Image
                    src={toImageUrl(currentForm.fileName)}
                    alt={`${creature.name} ${currentForm.title}`}
                    width={200}
                    height={200}
                    className="object-contain drop-shadow-lg"
                  />
                ) : (
                  <div className="text-gray-400 text-sm font-medium">暂无图片</div>
                )}
              </div>

              {/* 形态切换 */}
              {formOptions.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {formOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => selectForm(option.key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedFormKey === option.key
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 右侧：信息 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 标题和编号 */}
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{currentDisplayName}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    #{creature.id}
                  </span>
                  {creature.attributes.map((attr) => (
                    <span
                      key={attr}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                    >
                      {getAttributeLabel(attr)}系
                    </span>
                  ))}
                  {creature.attributes.length === 0 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                      未知属性
                    </span>
                  )}
                </div>
              </div>

              {/* 特性 */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">{traitName}</h2>
                <p className="text-gray-600">{traitDescription}</p>
              </div>

              {/* 种族值 */}
              {currentStatItems.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">种族值</h2>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {currentStatItems.map((stat) => (
                      <div
                        key={stat.key}
                        className={`rounded-xl p-3 text-center border ${
                          stat.highlight
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                        <div className={`text-xl font-bold ${stat.highlight ? 'text-blue-600' : 'text-gray-800'}`}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 技能列表 */}
        {skillSectionList.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">技能面板</span>
                <h2 className="text-xl font-bold text-gray-800">当前形态技能</h2>
              </div>
              <span className="text-sm text-gray-500">随当前形态切换</span>
            </div>

            <div className="space-y-6">
              {skillSectionList.map((section) => (
                <div key={section.key}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-700 font-medium">{section.title}</h3>
                    <span className="text-sm text-gray-500">{section.skills.length} 个</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {section.skills.map((skill) => (
                      <Link
                        key={skill.skillId}
                        href={`/skills/${skill.skillId}`}
                        className="group p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-center"
                      >
                        <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                          {skill.icon ? (
                            <Image
                              src={toSkillIconUrl(skill.icon)}
                              alt={skill.name}
                              width={40}
                              height={40}
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">技能</span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-800 group-hover:text-blue-600 truncate">
                          {skill.name}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
