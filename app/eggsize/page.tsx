'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ============== 类型定义 ==============
type MatchType = 'precise' | 'tolerance1' | 'tolerance2' | 'matched' | 'nearest';

interface EggItem {
  id: number;
  pet: string;
  petId: string;
  eggDiameter: string;
  eggWeight: string;
}

interface ParsedEggItem extends EggItem {
  diameterRange: { min: number; max: number };
  weightRange: { min: number; max: number };
}

interface SearchResult {
  pet: string;
  petId: string;
  eggDiameter: string;
  eggWeight: string;
  matchCount: number;
  probability: number;
  matchType: MatchType;
}

// 临时评分项类型
interface ScoredItem {
  _score: number;
  [key: string]: unknown;
}

// ============== 工具函数 ==============
// 标准化范围文本
function normalizeRangeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, '')
    .replace(/—|–|－/g, '-')
    .replace(/～|〜/g, '~');
}

// 解析范围字符串 (如 "0.4~0.6" 或 "3" 或 "0.2-0.2")
function parseRange(raw: string): { min: number; max: number } | null {
  const text = normalizeRangeText(raw);
  if (!text) return null;

  // 纯数字
  if (/^\d+(\.\d+)?$/.test(text)) {
    const v = Number(text);
    return Number.isFinite(v) ? { min: v, max: v } : null;
  }

  // 范围格式
  const parts = text.split(/[-~]/).filter(Boolean);
  if (parts.length !== 2) return null;

  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

// 范围跨度
function span(range: { min: number; max: number }): number {
  return Math.max(0.000001, range.max - range.min);
}

// 范围中心
function centerOfRange(range: { min: number; max: number }): number {
  return (range.min + range.max) / 2;
}

// 值是否在范围内
function inRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

// 值到范围的距离
function distanceToRange(value: number, range: { min: number; max: number }): number {
  if (value < range.min) return range.min - value;
  if (value > range.max) return value - range.max;
  return 0;
}

// 是否点范围（精确值）
function isPointRange(range: { min: number; max: number }): boolean {
  return Math.abs(range.max - range.min) < 1e-12;
}

// 几乎相等
function nearlyEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

// 高斯函数
function gaussian(z: number): number {
  return Math.exp(-0.5 * z * z);
}

// 夹值
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// 概率颜色
function probabilityColor(p: number): string {
  if (p >= 60) return '#67c23a';
  if (p >= 30) return '#e6a23c';
  return '#909399';
}

// 标准化精灵ID
function normalizePetId(petId: string | number): string {
  const raw = String(petId ?? '').trim();
  if (!raw || raw === '--') return '';
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return '';
  return String(Math.trunc(num)).padStart(3, '0');
}

// 获取图片URL
function getCreatureImageUrl(petId: string, imageMap: Record<string, string>): string {
  const fileName = imageMap[petId];
  if (fileName) {
    return `/creature-atlas/${fileName}`;
  }
  // 回退到 base 模式
  return `/creature-atlas/${petId}-base.webp`;
}

// 评价匹配行
function evaluateRow(
  diameter: number,
  weight: number,
  row: ParsedEggItem
): { matchType: MatchType; score: number } {
  const dIn = inRange(diameter, row.diameterRange);
  const wIn = inRange(weight, row.weightRange);
  const dPoint = isPointRange(row.diameterRange);
  const wPoint = isPointRange(row.weightRange);

  // 精准命中
  const precise = dPoint && wPoint && nearlyEqual(diameter, row.diameterRange.min) && nearlyEqual(weight, row.weightRange.min);
  if (precise) return { matchType: 'precise', score: 1200 };

  // 容差命中1 (±0.01, ±0.1)
  if (dPoint && wPoint) {
    const dDiff = Math.abs(diameter - row.diameterRange.min);
    const wDiff = Math.abs(weight - row.weightRange.min);
    if (dDiff <= 0.01 && wDiff <= 0.1) {
      const dNorm = dDiff / 0.01;
      const wNorm = wDiff / 0.1;
      const distance = Math.sqrt(dNorm * dNorm + wNorm * wNorm);
      const score = 1100 - distance * 120;
      return { matchType: 'tolerance1', score };
    }
  }

  // 容差命中2 (±0.02, ±0.2)
  if (dPoint && wPoint) {
    const dDiff = Math.abs(diameter - row.diameterRange.min);
    const wDiff = Math.abs(weight - row.weightRange.min);
    if (dDiff <= 0.02 && wDiff <= 0.2) {
      const dNorm = dDiff / 0.02;
      const wNorm = wDiff / 0.2;
      const distance = Math.sqrt(dNorm * dNorm + wNorm * wNorm);
      const score = 900 - distance * 140;
      return { matchType: 'tolerance2', score };
    }
  }

  // 范围命中
  if (dIn && wIn) {
    const dHalf = span(row.diameterRange) / 2;
    const wHalf = span(row.weightRange) / 2;
    const dBaseTol = 0.02;
    const wBaseTol = 0.4;
    const dZ = Math.abs(diameter - centerOfRange(row.diameterRange)) / (dHalf + dBaseTol);
    const wZ = Math.abs(weight - centerOfRange(row.weightRange)) / (wHalf + wBaseTol);
    const dScore = gaussian(dZ);
    const wScore = gaussian(wZ);
    let score = Math.pow(dScore, 0.58) * Math.pow(wScore, 0.42);
    const precisionBoost = 1 + 0.16 * (1 / (1 + span(row.diameterRange) * 12)) + 0.12 * (1 / (1 + span(row.weightRange) * 2));
    score *= clamp(precisionBoost, 1, 1.28);
    return { matchType: 'matched', score: score * 100 };
  }

  // 近似候选
  const score = 1 / (1 + distanceToRange(diameter, row.diameterRange) / 0.05 + distanceToRange(weight, row.weightRange) / 1.0);
  return { matchType: 'nearest', score: score * 50 };
}

// 标准化概率
function normalizeProbabilities(items: ScoredItem[]): { probability: number; color: string }[] {
  const sum = items.reduce((acc, item) => acc + item._score, 0);
  if (sum <= 0) {
    return items.map(() => ({ probability: 0, color: probabilityColor(0) }));
  }
  return items.map((item) => {
    const probability = Number(((item._score / sum) * 100).toFixed(2));
    return { probability, color: probabilityColor(probability) };
  });
}

// 按精灵聚合
function aggregateByPet(rows: (ParsedEggItem & { _score: number; matchType: MatchType })[]): SearchResult[] {
  const group = new Map<string, (ParsedEggItem & { _score: number; matchType: MatchType })[]>();
  for (const row of rows) {
    if (!group.has(row.pet)) group.set(row.pet, []);
    group.get(row.pet)!.push(row);
  }

  const merged: ScoredItem[] = [];
  const mergedData: Array<{
    pet: string;
    petId: string;
    eggDiameter: string;
    eggWeight: string;
    matchCount: number;
    matchType: MatchType;
  }> = [];

  for (const [pet, list] of group.entries()) {
    const sorted = [...list].sort((a, b) => b._score - a._score);
    let petScore = 0;
    for (let i = 0; i < sorted.length; i++) {
      petScore += sorted[i]._score * Math.pow(0.58, i);
    }
    const best = sorted[0];
    merged.push({ _score: petScore });
    mergedData.push({
      pet,
      petId: best.petId,
      eggDiameter: best.eggDiameter,
      eggWeight: best.eggWeight,
      matchCount: sorted.length,
      matchType: best.matchType,
    });
  }

  const probs = normalizeProbabilities(merged);

  return mergedData
    .map((item, idx) => ({
      ...item,
      probability: probs[idx].probability,
    }))
    .sort((a, b) => {
      const scoreA = a.probability;
      const scoreB = b.probability;
      return scoreB - scoreA;
    });
}

// 提取数据行
function extractEggMeasurementRows(eggJson: {
  groups?: Array<{
    petId?: string;
    pet?: string;
    rangeItems?: EggItem[];
    exactItems?: EggItem[];
  }>;
}): EggItem[] {
  const groups = Array.isArray(eggJson?.groups) ? eggJson.groups : [];
  const rows: EggItem[] = [];
  for (const group of groups) {
    const pet = group?.pet;
    const petId = group?.petId ?? '--';
    if (!pet) continue;

    const rangeItems = Array.isArray(group?.rangeItems) ? group.rangeItems : [];
    const exactItems = Array.isArray(group?.exactItems) ? group.exactItems : [];

    for (const item of [...rangeItems, ...exactItems]) {
      if (!item) continue;
      rows.push({
        id: item.id,
        pet,
        petId,
        eggDiameter: item.eggDiameter,
        eggWeight: item.eggWeight,
      });
    }
  }
  return rows;
}

// ============== 输入组件 ==============
interface NumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onEnter?: () => void;
}

function NumberInput({ label, value, onChange, placeholder, onEnter }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // 允许数字和小数点
    if (/^[\d.]*$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter();
        }}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
      />
    </div>
  );
}

// ============== 主页面 ==============
export default function EggSizePage() {
  const [diameterInput, setDiameterInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<MatchType>('nearest');
  const [exactResults, setExactResults] = useState<SearchResult[]>([]);
  const [candidates, setCandidates] = useState<SearchResult[]>([]);
  const [datasetCount, setDatasetCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  // 加载数据
  const loadData = useCallback(async () => {
    if (loaded) return;
    try {
      const [eggRes, creatureRes] = await Promise.all([
        fetch('/data/egg-measurements.json'),
        fetch('/data/creatures-master-list.json'),
      ]);

      if (!eggRes.ok) throw new Error('Failed to load egg data');
      if (!creatureRes.ok) throw new Error('Failed to load creature data');

      const eggData = await eggRes.json();
      const creatureData = await creatureRes.json();

      const rows = extractEggMeasurementRows(eggData);
      setDatasetCount(rows.length);

      // 构建精灵 ID 到图片文件名的映射
      const map: Record<string, string> = {};
      if (Array.isArray(creatureData?.creatures)) {
        for (const creature of creatureData.creatures) {
          const id = normalizePetId(creature?.id);
          const fileName = String(creature?.images?.default ?? '').trim();
          if (id && fileName) {
            map[id] = fileName;
          }
        }
      }
      setImageMap(map);
      setLoaded(true);
    } catch (err) {
      console.error('Data load failed:', err);
    }
  }, [loaded]);

  // 搜索
  const handleSearch = useCallback(async () => {
    await loadData();

    const d = parseFloat(diameterInput);
    const w = parseFloat(weightInput);

    if (isNaN(d) || isNaN(w)) {
      alert('请输入有效数字（蛋尺寸 / 蛋重量）');
      return;
    }

    if (d <= 0 || w <= 0) {
      alert('蛋尺寸和蛋重量必须大于 0');
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch('/data/egg-measurements.json');
      const data = await res.json();
      const rows = extractEggMeasurementRows(data);

      // 解析数据
      const parsedRows: ParsedEggItem[] = rows
        .map((row) => {
          const diameterRange = parseRange(row.eggDiameter);
          const weightRange = parseRange(row.eggWeight);
          if (!diameterRange || !weightRange) return null;
          return {
            ...row,
            diameterRange,
            weightRange,
          };
        })
        .filter((row): row is ParsedEggItem => row !== null);

      // 评分
      const scoredRows = parsedRows.map((row) => {
        const { matchType, score } = evaluateRow(d, w, row);
        return { ...row, matchType, _score: score };
      });

      // 精准匹配
      const preciseRows = scoredRows
        .filter((r) => r.matchType === 'precise')
        .sort((a, b) => Number(a.petId) - Number(b.petId) || a.pet.localeCompare(b.pet, 'zh-CN'));

      if (preciseRows.length > 0) {
        setSearchMode('precise');
        const probs = normalizeProbabilities(preciseRows);
        setExactResults(
          preciseRows.map((r, i) => ({
            pet: r.pet,
            petId: r.petId,
            eggDiameter: r.eggDiameter,
            eggWeight: r.eggWeight,
            matchCount: 1,
            probability: probs[i].probability,
            matchType: 'precise',
          }))
        );

        const rangeRows = scoredRows.filter((r) => r.matchType === 'matched');
        if (rangeRows.length > 0) {
          setCandidates(aggregateByPet(rangeRows).slice(0, 10));
        } else {
          const nearestRows = scoredRows
            .filter((r) => r.matchType === 'nearest')
            .sort((a, b) => b._score - a._score)
            .slice(0, 24);
          setCandidates(aggregateByPet(nearestRows).slice(0, 8));
        }
      } else {
        // 容差级别1
        const tolerance1Rows = scoredRows
          .filter((r) => r.matchType === 'tolerance1')
          .sort((a, b) => b._score - a._score);

        if (tolerance1Rows.length > 0) {
          setSearchMode('tolerance1');
          const probs = normalizeProbabilities(tolerance1Rows);
          setExactResults(
            tolerance1Rows.map((r, i) => ({
              pet: r.pet,
              petId: r.petId,
              eggDiameter: r.eggDiameter,
              eggWeight: r.eggWeight,
              matchCount: 1,
              probability: probs[i].probability,
              matchType: 'tolerance1',
            }))
          );

          const rangeRows = scoredRows.filter((r) => r.matchType === 'matched');
          if (rangeRows.length > 0) {
            setCandidates(aggregateByPet(rangeRows).slice(0, 10));
          } else {
            const nearestRows = scoredRows
              .filter((r) => r.matchType === 'nearest')
              .sort((a, b) => b._score - a._score)
              .slice(0, 24);
            setCandidates(aggregateByPet(nearestRows).slice(0, 8));
          }
        } else {
          // 容差级别2
          const tolerance2Rows = scoredRows
            .filter((r) => r.matchType === 'tolerance2')
            .sort((a, b) => b._score - a._score);

          if (tolerance2Rows.length > 0) {
            setSearchMode('tolerance2');
            const probs = normalizeProbabilities(tolerance2Rows);
            setExactResults(
              tolerance2Rows.map((r, i) => ({
                pet: r.pet,
                petId: r.petId,
                eggDiameter: r.eggDiameter,
                eggWeight: r.eggWeight,
                matchCount: 1,
                probability: probs[i].probability,
                matchType: 'tolerance2',
              }))
            );

            const rangeRows = scoredRows.filter((r) => r.matchType === 'matched');
            if (rangeRows.length > 0) {
              setCandidates(aggregateByPet(rangeRows).slice(0, 10));
            } else {
              const nearestRows = scoredRows
                .filter((r) => r.matchType === 'nearest')
                .sort((a, b) => b._score - a._score)
                .slice(0, 24);
              setCandidates(aggregateByPet(nearestRows).slice(0, 8));
            }
          } else {
            setExactResults([]);
            const matchedRows = scoredRows.filter((r) => r.matchType === 'matched');
            if (matchedRows.length > 0) {
              setSearchMode('matched');
              setCandidates(aggregateByPet(matchedRows).slice(0, 12));
            } else {
              setSearchMode('nearest');
              const nearestRows = scoredRows
                .sort((a, b) => b._score - a._score)
                .slice(0, 24);
              setCandidates(aggregateByPet(nearestRows).slice(0, 8));
            }
          }
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      alert('数据加载失败，请稍后重试');
    } finally {
      setSearching(false);
    }
  }, [diameterInput, weightInput, loadData]);

  const handleReset = useCallback(() => {
    setDiameterInput('');
    setWeightInput('');
    setHasSearched(false);
    setExactResults([]);
    setCandidates([]);
    setSearchMode('nearest');
  }, []);

  const getMatchLabel = (type: MatchType) => {
    switch (type) {
      case 'precise':
        return '精准命中';
      case 'tolerance1':
        return '容差命中（±0.01, ±0.1）';
      case 'tolerance2':
        return '容差命中（±0.02, ±0.2）';
      case 'matched':
        return '范围命中';
      case 'nearest':
        return '近似候选';
      default:
        return '';
    }
  };

  const getMatchColor = (type: MatchType) => {
    switch (type) {
      case 'precise':
        return 'bg-red-100 text-red-700';
      case 'tolerance1':
      case 'tolerance2':
        return 'bg-yellow-100 text-yellow-700';
      case 'matched':
        return 'bg-green-100 text-green-700';
      case 'nearest':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 返回首页按钮 */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-4 py-2 bg-white rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">返回首页</span>
          </Link>
        </div>

        {/* 标题卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {' '}
              🥚 精灵蛋尺寸查询{' '}
            </h1>
            <p className="text-sm text-gray-500">洛克王国：世界</p>
            <p className="text-xs text-gray-400 mt-2">
              {' '}
              数据条数：<span className="font-semibold text-gray-600">
                {datasetCount > 0 ? datasetCount : '加载中...'}
              </span>
            </p>
          </div>

          {/* 输入区域 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="蛋尺寸 (m)"
                value={diameterInput}
                onChange={setDiameterInput}
                placeholder="例如：0.22"
                onEnter={handleSearch}
              />
              <NumberInput
                label="蛋重量 (kg)"
                value={weightInput}
                onChange={setWeightInput}
                placeholder="例如：2.44"
                onEnter={handleSearch}
              />
            </div>

            {/* 按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSearch}
                disabled={searching}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {searching ? '查询中...' : '查询精灵'}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                重置
              </button>
            </div>
          </div>
        </div>

        {/* 结果区域 */}
        {hasSearched && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {/* 搜索模式标签 */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">🔍 匹配结果</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMatchColor(searchMode)}`}>
                {getMatchLabel(searchMode)}
              </span>
            </div>

            {/* 正在搜索 */}
            {searching && (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <p>正在搜索...</p>
              </div>
            )}

            {/* 无结果 */}
            {!searching && exactResults.length === 0 && candidates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>未找到匹配的精灵</p>
              </div>
            )}

            {/* 精确匹配结果 */}
            {!searching && exactResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-3">
                  {['precise', 'tolerance1', 'tolerance2'].includes(searchMode)
                    ? getMatchLabel(searchMode)
                    : '精准命中'}
                </h3>
                <div className="space-y-3">
                  {exactResults.map((item, index) => (
                    <div
                      key={`exact-${item.petId}-${index}`}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100"
                    >
                      {/* 图片 */}
                      <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <Image
                          src={getCreatureImageUrl(normalizePetId(item.petId), imageMap)}
                          alt={item.pet}
                          fill
                          className="object-contain p-1"
                          onError={(e) => {
                            // 图片加载失败时隐藏
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-800">
                            {' '}
                            {index + 1}. {item.pet}
                          </h4>
                          <span className="text-xs text-gray-500">#{item.petId}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {' '}
                          尺寸: {item.eggDiameter}m ｜ 重量: {item.eggWeight}kg
                        </p>
                      </div>

                      {/* 概率 */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{item.probability}%</div>
                        <div className="w-20 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${item.probability}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 候选结果 */}
            {!searching && candidates.length > 0 && (
              <div>
                {exactResults.length > 0 && (
                  <h3 className="text-sm font-medium text-gray-600 mb-3">其他候选</h3>
                )}
                <div className="space-y-3">
                  {candidates.map((item, index) => (
                    <div
                      key={`${item.petId}-${index}`}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      {/* 图片 */}
                      <div className="relative w-14 h-14 flex-shrink-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <Image
                          src={getCreatureImageUrl(normalizePetId(item.petId), imageMap)}
                          alt={item.pet}
                          fill
                          className="object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-800">
                            {' '}
                            {index + 1}. {item.pet}
                          </h4>
                          <span className="text-xs text-gray-500">#{item.petId}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {' '}
                          尺寸: {item.eggDiameter} ｜ 重量: {item.eggWeight}
                          {item.matchCount > 1 && (
                            <span className="ml-2 text-blue-600">命中记录: {item.matchCount}条</span>
                          )}
                        </p>
                      </div>

                      {/* 概率 */}
                      <div className="text-right">
                        <div
                          className="text-lg font-semibold"
                          style={{ color: probabilityColor(item.probability) }}
                        >
                          {' '}
                          {item.probability}%
                        </div>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${item.probability}%`,
                              backgroundColor: probabilityColor(item.probability),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 说明 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500"> 输入精灵蛋的尺寸和重量，查询可能对应的精灵 </p>
        </div>
      </div>
    </div>
  );
}
