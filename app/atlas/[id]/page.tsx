import fs from 'fs';
import path from 'path';
import { Suspense } from 'react';
import CreatureDetailClient from './CreatureDetailClient';

interface CreatureData {
  id: string;
  name: string;
}

interface CreaturesList {
  creatures: CreatureData[];
}

async function getAllCreatureIds(): Promise<string[]> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'creatures-master-list.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: CreaturesList = JSON.parse(content);
    if (!Array.isArray(data?.creatures)) return [];
    return data.creatures
      .map((c) => c?.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const ids = await getAllCreatureIds();
  return ids.map((id) => ({ id }));
}

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

function LoadingFallback() {
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

export default async function CreatureDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreatureDetailClient creatureId={resolvedParams.id} />
    </Suspense>
  );
}

export const dynamicParams = false;
