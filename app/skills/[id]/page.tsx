import fs from 'fs';
import path from 'path';
import { Suspense } from 'react';
import SkillDetailClient from './SkillDetailClient';

interface Skill {
  skillId: string;
  name: string;
}

interface SkillsList {
  skills: Skill[];
}

async function getAllSkillIds(): Promise<string[]> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'skills-master-list.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: SkillsList = JSON.parse(content);
    if (!Array.isArray(data?.skills)) return [];
    return data.skills
      .map((s) => s?.skillId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const ids = await getAllSkillIds();
  return ids.map((id) => ({ id }));
}

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
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

export default async function SkillDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SkillDetailClient skillId={resolvedParams.id} />
    </Suspense>
  );
}

export const dynamicParams = false;
