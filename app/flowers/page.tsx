'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';

type TimeValue = {
  hours: string;
  minutes: string;
};

// 时间输入框组件 - 包含所有优化功能
interface TimeInputGroupProps {
  label: string;
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  onEnter?: () => void;
}

function TimeInputGroup({ label, value, onChange, onEnter }: TimeInputGroupProps) {
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  // 处理输入
  const handleInputChange = (
    field: 'hours' | 'minutes',
    inputValue: string,
    max: number
  ) => {
    // 只保留数字
    const sanitized = inputValue.replace(/[^0-9]/g, '');
    // 限制最大2位
    const limited = sanitized.slice(0, 2);

    // 如果直接输入2位数字，不格式化，保留原始输入
    onChange({ ...value, [field]: limited });

    // 自动跳转逻辑：只有输入1位数字且大于2时才跳转（因为时间不可能超过23点/59分）
    // 这样用户输入10-23时不会自动跳转，但输入3-9时会自动跳
    if (limited.length === 1) {
      const num = parseInt(limited, 10);
      // 小时输入：如果输入3-9，直接跳到分钟（因为3x小时不存在）
      // 分钟输入：如果输入6-9，直接跳到下一个（因为6x分钟不存在）
      if (field === 'hours' && num >= 3 && num <= 9) {
        minutesRef.current?.focus();
      }
    }
  };

  // 处理失去焦点 - 自动补零（只在1位数字时补零）
  const handleBlur = (field: 'hours' | 'minutes', max: number) => {
    const currentValue = value[field];
    if (currentValue === '' || currentValue === undefined) return;
    
    const num = parseInt(currentValue, 10);
    if (isNaN(num)) return;
    
    let formatted: string;
    if (num > max) {
      // 超过最大值时设为最大值
      formatted = String(max);
    } else if (currentValue.length === 1) {
      // 只有1位数字时才补零（如 "1" -> "01"）
      // 这样用户输入 "10" 等两位数不会被改成 "010"
      formatted = '0' + currentValue;
    } else {
      // 2位数字直接保留（如10,11,12...）
      formatted = currentValue;
    }
    onChange({ ...value, [field]: formatted });
  };

  // 处理键盘事件
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'hours' | 'minutes'
  ) => {
    // Tab 或右箭头键跳转到分钟
    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowRight') {
      if (field === 'hours') {
        e.preventDefault();
        minutesRef.current?.focus();
      }
    }
    // Shift+Tab 或左箭头键跳转到小时
    if ((e.key === 'Tab' && e.shiftKey) || e.key === 'ArrowLeft') {
      if (field === 'minutes') {
        e.preventDefault();
        hoursRef.current?.focus();
      }
    }
    // Enter 跳转
    if (e.key === 'Enter') {
      if (field === 'hours') {
        e.preventDefault();
        minutesRef.current?.focus();
      } else if (onEnter) {
        onEnter();
      }
    }
    // Backspace 为空且是分钟时，跳回小时
    if (e.key === 'Backspace' && value.minutes === '' && field === 'minutes') {
      hoursRef.current?.focus();
    }
  };

  // 阻止非数字输入
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-blue-400 transition-colors">
        <input
          ref={hoursRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="00"
          value={value.hours}
          onChange={(e) => handleInputChange('hours', e.target.value, 23)}
          onBlur={() => handleBlur('hours', 23)}
          onKeyDown={(e) => handleKeyDown(e, 'hours')}
          onKeyPress={handleKeyPress}
          className="w-14 px-2 py-2 bg-white border border-gray-300 rounded-lg text-center text-lg font-mono font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-300"
        />
        <span className="text-xl font-light text-gray-400">:</span>
        <input
          ref={minutesRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="00"
          value={value.minutes}
          onChange={(e) => handleInputChange('minutes', e.target.value, 59)}
          onBlur={() => handleBlur('minutes', 59)}
          onKeyDown={(e) => handleKeyDown(e, 'minutes')}
          onKeyPress={handleKeyPress}
          className="w-14 px-2 py-2 bg-white border border-gray-300 rounded-lg text-center text-lg font-mono font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-300"
        />
      </div>
    </div>
  );
}

// 数量输入框组件
interface NumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onEnter?: () => void;
}

function NumberInput({ label, value, onChange, placeholder, onEnter }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^0-9]/g, '');
    onChange(sanitized);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyPress={(e) => {
          if (!/[0-9]/.test(e.key)) e.preventDefault();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter();
        }}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
      />
    </div>
  );
}

export default function FlowerCalculator() {
  const [startTime, setStartTime] = useState<TimeValue>({ hours: '', minutes: '' });
  const [endTime, setEndTime] = useState<TimeValue>({ hours: '', minutes: '' });
  const [startCount, setStartCount] = useState<string>('');
  const [endCount, setEndCount] = useState<string>('');

  // 计算结果
  const result = useMemo(() => {
    const startH = parseInt(startTime.hours, 10);
    const startM = parseInt(startTime.minutes, 10);
    const endH = parseInt(endTime.hours, 10);
    const endM = parseInt(endTime.minutes, 10);
    const startNum = parseInt(startCount, 10);
    const endNum = parseInt(endCount, 10);

    if (
      isNaN(startH) ||
      isNaN(startM) ||
      isNaN(endH) ||
      isNaN(endM) ||
      isNaN(startNum) ||
      isNaN(endNum)
    ) {
      return null;
    }

    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;
    let diffMinutes = endTotalMinutes - startTotalMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }
    const diffHours = diffMinutes / 60;
    const countDiff = endNum - startNum;

    if (diffHours <= 0 || countDiff < 0) {
      return null;
    }

    return {
      totalHours: diffHours,
      totalCount: countDiff,
      efficiency: countDiff / diffHours,
      totalMinutes: diffMinutes,
    };
  }, [startTime, endTime, startCount, endCount]);

  const formatNumber = (num: number, decimals: number = 0) => {
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const handleClear = () => {
    setStartTime({ hours: '', minutes: '' });
    setEndTime({ hours: '', minutes: '' });
    setStartCount('');
    setEndCount('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* 返回首页按钮 */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-4 py-2 bg-gray-50 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">返回首页</span>
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            🌸 刷花效率计算器
          </h1>
          <p className="text-sm text-gray-500">洛克王国：世界</p>
        </div>

        {/* Input Section */}
        <div className="space-y-6">
          {/* Time Section */}
          <div className="grid grid-cols-2 gap-4">
            <TimeInputGroup label="开始时间" value={startTime} onChange={setStartTime} />
            <TimeInputGroup label="结束时间" value={endTime} onChange={setEndTime} />
          </div>

          {/* Count Section */}
          <div className="space-y-4">
            <NumberInput
              label="开始数量"
              value={startCount}
              onChange={setStartCount}
              placeholder="输入开始数量"
            />
            <NumberInput
              label="结束数量"
              value={endCount}
              onChange={setEndCount}
              placeholder="输入结束数量"
            />
          </div>
        </div>

        {/* Result Section */}
        <div className="mt-8">
          {result ? (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-6 text-white">
              <p className="text-center text-sm opacity-80 mb-2">平均效率</p>
              <div className="text-center">
                <span className="text-4xl font-bold">{formatNumber(result.efficiency, 1)}</span>
                <span className="text-lg ml-1">朵/小时</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs opacity-70">采集耗时</p>
                  <p className="text-lg font-medium">
                    {result.totalMinutes >= 60
                      ? `${formatNumber(result.totalHours, 1)}小时`
                      : `${result.totalMinutes}分钟`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs opacity-70">采集数量</p>
                  <p className="text-lg font-medium">{result.totalCount}朵</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-6 text-gray-400 text-center">
              <p>请输入完整数据查看结果</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            清空数据
          </button>
        </div>
      </div>
    </div>
  );
}
