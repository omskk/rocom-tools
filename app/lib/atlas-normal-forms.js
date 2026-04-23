export const ATLAS_NORMAL_FORM_LABELS = Object.freeze({
  "鸭吉吉": Object.freeze([
    "蓬松的样子",
    "紧实的样子",
    "急急急鸭",
    "等一等鸭",
    "起来鸭",
    "燃了鸭",
  ]),

  "板板壳": Object.freeze(["本来的样子"]),
  "咔咔壳": Object.freeze(["本来的样子"]),
  "水泡壳": Object.freeze(["本来的样子"]),

  "雪绒鸟": Object.freeze(["本来的样子"]),
  "冬羽雀": Object.freeze(["本来的样子"]),
  "岚鸟": Object.freeze(["本来的样子"]),

  "石肤蜥": Object.freeze(["本来的样子"]),
  "石刺蜥": Object.freeze(["本来的样子"]),
  "石冠王蜥": Object.freeze(["本来的样子"]),

  "化蝶": Object.freeze(["平常的样子"]),

  "晶石蜗": Object.freeze(["西瓜碧玺的样子"]),

  "丢丢": Object.freeze(["草地附近的样子"]),
  "卡卡虫": Object.freeze(["草地附近的样子"]),
  "卡瓦重": Object.freeze(["草地附近的样子"]),

  "暗影灵面": Object.freeze(["睁眼的样子"]),
  "幽冥眼": Object.freeze(["睁眼的样子"]),

  "梦游": Object.freeze(["穿旧睡衣的样子"]),
  "梦悠悠": Object.freeze(["穿旧睡衣的样子"]),

  "蹦蹦种子": Object.freeze(["海神球形态"]),
  "蹦蹦草": Object.freeze(["海神球形态"]),
  "蹦蹦花": Object.freeze(["海神球形态"]),

  "海盔虫": Object.freeze(["本来的样子"]),
  "刺盔虫": Object.freeze(["本来的样子"]),
  "千棘盔": Object.freeze(["本来的样子"]),

  "小星光": Object.freeze(["星光能量的样子"]),
  "星光狮": Object.freeze(["星光能量的样子"]),

  "小狮鹫": Object.freeze(["崖间地的样子"]),
  "神圣狮鹫": Object.freeze(["崖间地的样子"]),
  "皇家狮鹫": Object.freeze(["崖间地的样子"]),

  "棋棋": Object.freeze(["白子"]),
  "棋骑士": Object.freeze(["白子"]),
  "棋齐垒": Object.freeze(["白子"]),
  "棋祈督": Object.freeze(["白子"]),
  "棋绮后": Object.freeze(["白子"]),

  "古钟蛇": Object.freeze(["本来的样子"]),
  "寒音蛇": Object.freeze(["本来的样子"]),

  "海枝枝": Object.freeze(["碧蓝珊瑚"]),

  "刺轮砣": Object.freeze(["上弦的样子"]),
  "月亮砣": Object.freeze(["上弦的样子"]),

  "乌达": Object.freeze(["极昼的样子"]),
  "迷你乌": Object.freeze(["极昼的样子"]),
  "乌拉塔": Object.freeze(["极昼的样子"]),

  "地鼠": Object.freeze(["枯水期的样子"]),
  "遁鼠": Object.freeze(["枯水期的样子"]),
  "遁地鼠": Object.freeze(["枯水期的样子"]),

  "旋叶虫": Object.freeze(["金黄的样子"]),
  "蓬叶虫": Object.freeze(["金黄的样子"]),
  "风滚暮虫": Object.freeze(["金黄的样子"]),
});

export const ATLAS_NORMAL_FORM_NAMES = Object.freeze(
  Object.keys(ATLAS_NORMAL_FORM_LABELS),
);

export function getAtlasNormalFormLabels(creatureName) {
  const name = String(creatureName ?? "").trim();
  return ATLAS_NORMAL_FORM_LABELS[name] || Object.freeze([]);
}

export function hasAtlasNormalFormWhitelist(creatureName) {
  const name = String(creatureName ?? "").trim();
  return Object.prototype.hasOwnProperty.call(ATLAS_NORMAL_FORM_LABELS, name);
}

export function isAtlasNormalForm(creatureName, formLabel = "") {
  const name = String(creatureName ?? "").trim();
  const label = String(formLabel ?? "").trim();

  if (!name) return false;

  // 有明确白名单：只有白名单中的形态才算普通形态
  if (hasAtlasNormalFormWhitelist(name)) {
    return getAtlasNormalFormLabels(name).includes(label);
  }

  // 没有白名单：无形态标签的基础形态视为普通形态
  if (!label) return true;

  // 没有白名单但存在形态标签：默认不算普通形态
  return false;
}
