'use client';

import Link from 'next/link';

// 工具列表
const tools = [
  {
    id: 'flowers',
    name: '刷花效率计算器',
    icon: '🌸',
    description: '计算洛克王国：世界中采集花朵的效率',
    href: '/flowers',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
  {
    id: 'eggsize',
    name: '精灵蛋查询',
    icon: '🥚',
    description: '根据蛋尺寸和重量查询对应精灵，含1520条数据',
    href: '/eggsize',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'atlas',
    name: '精灵图鉴',
    icon: '👾',
    description: '浏览所有精灵的图鉴信息，支持按系别、形态筛选',
    href: '/atlas',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'skills',
    name: '技能图鉴',
    icon: '⚡',
    description: '浏览所有技能信息，支持按属性、分类、学习精灵数筛选',
    href: '/skills',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎮</span>
            <div>
              <h1 className="text-xl font-bold text-gray-800">洛克王国工具集</h1>
              <p className="text-xs text-gray-500">洛克王国：世界 - 实用工具合集</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            🧰 实用工具，一键触达
          </h2>
          <p className="text-gray-600 max-w-lg mx-auto">
            为洛克王国：世界玩家打造的各种实用工具，帮助你更高效地游戏
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="group block h-full p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:shadow-lg hover:border-blue-200 transition-all duration-300"
            >
              {/* Icon */}
              <div
                className={`w-14 h-14 mb-4 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br ${tool.color} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}
              >
                {tool.icon}
              </div>
              {/* Text */}
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {tool.description}
              </p>
              {/* Arrow */}
              <div className="mt-4 flex items-center text-sm font-medium text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>开始使用</span>
                <svg
                  className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400">更多工具正在开发中 🚀</p>
        </div>
      </main>
    </div>
  );
}
