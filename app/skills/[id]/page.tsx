'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// ============== 类型定义 ==============
interface Skill {
  skillId: string;
  name: string;
  attribute: string;
  category: string;
  icon: string;
  energyCost: number;
  power: number;
  effect: string;
  learners: Learner[];
}

interface Learner {
  refType: string;
  creatureId: string;
  creatureName: string;
  displayName: string;
  formName: string;
}

interface Creature {
  id: string;
  name: string;
  images: {
    default: string;
    base: string;
    forms: Record<string, string>;
    bossForms: Record<string, string>;
    bossFormVariants: Record<string, Record<string, string>>;
  };
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

const CATEGORY_LABEL_MAP: Record<string, string> = {
  physical: '物攻',
  magical: '魔攻',
  status: '状态',
};

// ============== 工具函数 ==============
function getAttributeLabel(value: string): string {
  return ATTRIBUTE_LABEL_MAP[value] || value || '未知';
}

function getCategoryLabel(value: string): string {
  return CATEGORY_LABEL_MAP[value] || value || '未知';
}

function toSkillIconUrl(fileName: string): string {
  return fileName ? `/skill-icons/${fileName}` : '';
}

function toCreatureImageUrl(fileName: string): string {
  return fileName ? `/creature-atlas/${fileName}` : '';
}

function normalizeSkill(rawItem: unknown): Skill | null {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const item = rawItem as Record<string, unknown>;
  const learners = Array.isArray(item.learners) ? item.learners : [];
  return {
    skillId: String(item.skillId || '').trim(),
    name: String(item.name || '未命名技能').trim(),
    attribute: String(item.attribute || '').trim(),
    category: String(item.category || '').trim(),
    icon: String(item.icon || '').trim(),
    energyCost: Number(item.energyCost ?? 0),
    power: Number(item.power ?? 0),
    effect: String(item.effect || '').trim(),
    learners: learners.map((l: unknown) => normalizeLearner(l)),
  };
}

function normalizeLearner(rawItem: unknown): Learner {
  if (!rawItem || typeof rawItem !== 'object') {
    return { refType: '', creatureId: '', creatureName: '', displayName: '', formName: '' };
  }
  const item = rawItem as Record<string, unknown>;
  return {
    refType: String(item.refType || '').trim(),
    creatureId: String(item.creatureId || '').trim(),
    creatureName: String(item.creatureName || '').trim(),
    displayName: String(item.displayName || '').trim(),
    formName: String(item.formName || '').trim(),
  };
}

function normalizeCreature(rawItem: unknown): Creature | null {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const item = rawItem as Record<string, unknown>;
  return {
    id: String(item.id || '').trim(),
    name: String(item.name || '').trim(),
    images: {
      default: String((item.images as Record<string, unknown>)?.default || '').trim(),
      base: String((item.images as Record<string, unknown>)?.base || '').trim(),
      forms: ((item.images as Record<string, unknown>)?.forms as Record<string, string>) || {},
      bossForms: ((item.images as Record<string, unknown>)?.bossForms as Record<string, string>) || {},
      bossFormVariants: ((item.images as Record<string, unknown>)?.bossFormVariants as Record<string, Record<string, string>>) || {},
    },
  };
}

function normalizeFormLabel(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\(/g, '（')
    .replace(/\)/g, '）')
    .replace(/时的样子/g, '期的样子');
}

function extractDisplayFormName(displayName: string, creatureName: string): string {
  const fullName = String(displayName || '').trim();
  const baseName = String(creatureName || '').trim();
  if (!fullName) return '';
  if (baseName && fullName.startsWith(baseName)) {
    const suffix = fullName.slice(baseName.length).trim();
    if (suffix.startsWith('（') && suffix.endsWith('）')) {
      return suffix.slice(1, -1).trim();
    }
    if (suffix.startsWith('(') && suffix.endsWith(')')) {
      return suffix.slice(1, -1).trim();
    }
  }
  const bracketMatch = fullName.match(/[（(]([^（）()]+)[）)]/);
  return bracketMatch ? String(bracketMatch[1] || '').trim() : '';
}

function buildLearnerFormCandidates(learner: Learner): string[] {
  const candidates = [
    String(learner?.formName || '').trim(),
    extractDisplayFormName(learner?.displayName, learner?.creatureName),
  ].filter(Boolean);
  return [...new Set(candidates)];
}

function findImageByFormCandidates(
  imageMap: Record<string, string>,
  candidates: string[]
): string {
  const entries = Object.entries(imageMap || {}).filter(([, fileName]) =>
    String(fileName || '').trim()
  );
  if (!entries.length || !candidates.length) return '';

  for (const candidate of candidates) {
    const exactMatched = imageMap?.[candidate];
    if (exactMatched) {
      return toCreatureImageUrl(exactMatched);
    }
  }

  const normalizedCandidates = candidates.map((item) => ({
    raw: item,
    normalized: normalizeFormLabel(item),
  }));

  for (const [label, fileName] of entries) {
    const normalizedLabel = normalizeFormLabel(label);
    const matched = normalizedCandidates.some(
      (item) => item.normalized && item.normalized === normalizedLabel
    );
    if (matched) {
      return toCreatureImageUrl(fileName);
    }
  }
  return '';
}

function resolveLearnerImage(learner: Learner, creatureMap: Map<string, Creature>): string {
  const creatureId = String(learner?.creatureId || '').trim();
  const refType = String(learner?.refType || '').trim();
  const creature = creatureMap.get(creatureId);
  const formCandidates = buildLearnerFormCandidates(learner);

  if (!creature) return '';

  if (refType === 'form') {
    const matchedImage = findImageByFormCandidates(creature.images.forms, formCandidates);
    if (matchedImage) return matchedImage;
  }
  if (refType === 'boss') {
    const matchedImage = findImageByFormCandidates(creature.images.bossForms, formCandidates);
    if (matchedImage) return matchedImage;
  }
  if (refType === 'boss-variant') {
    for (const variants of Object.values(creature.images.bossFormVariants || {})) {
      const matchedImage = findImageByFormCandidates(variants, formCandidates);
      if (matchedImage) return matchedImage;
    }
  }
  return toCreatureImageUrl(creature.images.default || creature.images.base || '');
}

function parseLearnerDisplayName(displayName: string, creatureName: string) {
  const fullName = String(displayName || '').trim();
  const baseName = String(creatureName || '').trim();
  if (!fullName) {
    return { title: baseName || '未知精灵', subtitle: '' };
  }
  if (baseName && fullName.startsWith(baseName)) {
    const suffix = fullName.slice(baseName.length).trim();
    const cleaned =
      suffix.startsWith('（') && suffix.endsWith('）')
        ? suffix.slice(1, -1).trim()
        : suffix;
    return { title: baseName, subtitle: cleaned };
  }
  return { title: fullName, subtitle: '' };
}

// ============== 主页面 ==============
export default function SkillDetailPage() {
  const params = useParams();
  const skillId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [skill, setSkill] = useState<Skill | null>(null);
  const [creatureMap, setCreatureMap] = useState<Map<string, Creature>>(new Map());

  // 加载数据
  useEffect(() => {
    async function loadSkillDetail() {
      setLoading(true);
      setErrorMessage('');

      try {
        if (!skillId) {
          throw new Error('缺少技能编号');
        }

        const [skillRes, creatureRes] = await Promise.all([
          fetch('/data/skills-master-list.json', { cache: 'no-cache' }),
          fetch('/data/creatures-master-list.json', { cache: 'no-cache' }),
        ]);

        if (!skillRes.ok) throw new Error(`技能数据加载失败：${skillRes.status}`);
        if (!creatureRes.ok) throw new Error(`精灵数据加载失败：${creatureRes.status}`);

        const skillData = await skillRes.json();
        const creatureData = await creatureRes.json();

        // 处理技能数据
        const skillList = Array.isArray(skillData?.skills) ? skillData.skills : [];
        const matchedSkill = skillList.find(
          (item: { skillId?: string }) => String(item?.skillId || '').trim() === skillId
        );
        if (!matchedSkill) {
          throw new Error(`未找到编号为 ${skillId} 的技能`);
        }

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
        setSkill(normalizeSkill(matchedSkill));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '技能详情数据加载失败');
      } finally {
        setLoading(false);
      }
    }

    loadSkillDetail();
  }, [skillId]);

  // 技能标签
  const skillTags = useMemo(() => {
    if (!skill) return [];
    return [
      { key: 'attribute', label: getAttributeLabel(skill.attribute) },
      { key: 'category', label: getCategoryLabel(skill.category) },
    ];
  }, [skill]);

  // 学习者列表
  const learnerItems = useMemo(() => {
    if (!skill) return [];
    return skill.learners.map((item, index) => {
      const parsed = parseLearnerDisplayName(item.displayName, item.creatureName);
      return {
        key: `${skill.skillId}:${item.creatureId}:${index}`,
        creatureId: item.creatureId,
        title: parsed.title,
        subtitle: parsed.subtitle,
        displayName: item.displayName || item.creatureName || '未知精灵',
        imageUrl: resolveLearnerImage(item, creatureMap),
      };
    });
  }, [skill, creatureMap]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="text-red-600 font-medium">⚠️ {errorMessage}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500">
            未找到技能数据
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <Link
          href="/skills"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回技能图鉴
        </Link>

        {/* 技能概览卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
            {/* 左侧：技能图标 */}
            <div className="text-center">
              <div className="w-36 h-36 mx-auto flex items-center justify-center">
                {skill.icon ? (
                  <Image
                    src={toSkillIconUrl(skill.icon)}
                    alt={skill.name}
                    width={140}
                    height={140}
                    className="object-contain"
                  />
                ) : (
                  <div className="text-gray-400 text-sm">技能图标</div>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mt-4">{skill.name}</h1>
            </div>

            {/* 右侧：技能信息 */}
            <div className="space-y-4">
              {/* 技能效果 */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">技能效果</h2>
                <p className="text-gray-600 leading-relaxed">{skill.effect || '暂无技能说明'}</p>
              </div>

              {/* 属性信息网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {skillTags.map((tag) => (
                  <div
                    key={tag.key}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 text-center"
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {tag.key === 'attribute' ? '属性' : '分类'}
                    </div>
                    <div className="text-xl font-bold text-blue-600">{tag.label}</div>
                  </div>
                ))}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100 text-center">
                  <div className="text-xs text-gray-500 mb-1">耗能</div>
                  <div className="text-xl font-bold text-purple-600">{skill.energyCost}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 text-center">
                  <div className="text-xs text-gray-500 mb-1">威力</div>
                  <div className="text-xl font-bold text-amber-600">{skill.power}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 学习者列表 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                学习者列表
              </span>
              <h2 className="text-xl font-bold text-gray-800">全部学习者</h2>
            </div>
          </div>

          {learnerItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {learnerItems.map((item) => (
                <Link
                  key={item.key}
                  href={`/atlas/${item.creatureId}`}
                  className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="w-16 h-16 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.displayName}
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">暂无图片</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-800 group-hover:text-blue-600 truncate">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              当前技能暂无学习者数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
