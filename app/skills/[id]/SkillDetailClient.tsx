'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Skill {
  skillId: string;
  name: string;
  attribute: string;
  category: string;
  icon?: string;
  energyCost: number;
  power: number;
  effect: string;
}

interface Creature {
  creatureId: string;
  name: string;
  default: string[];
  forms: Record<string, string[]>;
  bossForms: Record<string, string[]>;
  bossFormVariants: Record<string, Record<string, string[]>>;
}

interface SkillDetailClientProps {
  skillId: string;
}

export default function SkillDetailClient({ skillId }: SkillDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [skill, setSkill] = useState<Skill | null>(null);
  const [learners, setLearners] = useState<Creature[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [skillRes, learnsetRes] = await Promise.all([
          fetch('/data/skills-master-list.json', { cache: 'no-cache' }),
          fetch('/data/creature-skill-learnsets.json', { cache: 'no-cache' }),
        ]);

        const skillData = await skillRes.json();
        const learnsetData = await learnsetRes.json();

        const foundSkill = skillData.skills.find(
          (s: Skill) => s.skillId === skillId
        );
        if (!foundSkill) {
          throw new Error('技能不存在');
        }
        setSkill(foundSkill);

        // 查找学习该技能的精灵
        const learnersList: Creature[] = [];
        const creatures = learnsetData.creatures || [];

        for (const creature of creatures as Creature[]) {
          const learns =
            creature.default?.includes(skillId) ||
            Object.values(creature.forms || {}).some((arr) =>
              arr.includes(skillId)
            ) ||
            Object.values(creature.bossForms || {}).some((arr) =>
              arr.includes(skillId)
            );

          if (learns) {
            learnersList.push(creature);
          }
        }
        setLearners(learnersList);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [skillId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-red-500">{error || '技能不存在'}</div>
          <div className="text-center mt-4">
            <button
              onClick={() => router.push('/skills')}
              className="text-blue-500 hover:underline"
            >
              返回技能列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-2xl font-bold">{skill.name}</h1>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">属性</div>
              <div className="text-lg font-medium">{skill.attribute}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">分类</div>
              <div className="text-lg font-medium">{skill.category}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">PP</div>
              <div className="text-lg font-medium">{skill.energyCost}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">威力</div>
              <div className="text-lg font-medium">{skill.power}</div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg mb-6">
            <div className="text-sm text-gray-500">效果</div>
            <div className="mt-1">{skill.effect}</div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">学习该技能的精灵</h2>
            {learners.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {learners.map((creature) => (
                  <Link
                    key={creature.creatureId}
                    href={`/atlas/${creature.creatureId}`}
                    className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <div className="font-medium">{creature.name}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">暂无精灵学习该技能</div>
            )}
          </div>

          <div className="mt-6">
            <Link href="/skills" className="text-blue-500 hover:underline">
              ← 返回技能列表
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
