export function buildGroupIndex(masterNames = [], evolutionChains = [], eggGroupInput = {}) {
  const groupsByPet = new Map();
  const stageToBase = new Map();
  const stageToFinal = new Map();
  const stageToChainText = new Map();
  const baseToMembers = new Map();
  const baseToChain = new Map();
  const baseToChains = new Map();
  const allPetNames = new Set(Array.isArray(masterNames) ? masterNames : []);

  const addGroup = (pet, group) => {
    if (!pet || !group) return;
    if (!groupsByPet.has(pet)) groupsByPet.set(pet, new Set());
    groupsByPet.get(pet).add(group);
  };

  for (const [group, pets] of Object.entries(eggGroupInput || {})) {
    for (const pet of Array.isArray(pets) ? pets : []) {
      addGroup(pet, group);
      allPetNames.add(pet);
    }
  }

  for (const chain of Array.isArray(evolutionChains) ? evolutionChains : []) {
    if (!Array.isArray(chain) || chain.length === 0) continue;

    const names = chain
      .map((stage) => stage?.name)
      .filter(Boolean);

    if (!names.length) continue;

    const base = names[0];
    const final = names[names.length - 1];
    const chainText = names.join(" → ");

    if (!baseToMembers.has(base)) baseToMembers.set(base, new Set());
    const memberSet = baseToMembers.get(base);
    for (const name of names) memberSet.add(name);

    if (!baseToChain.has(base)) baseToChain.set(base, names);
    if (!baseToChains.has(base)) baseToChains.set(base, []);
    baseToChains.get(base).push(names);

    for (const name of names) {
      stageToBase.set(name, base);
      stageToFinal.set(name, final);
      stageToChainText.set(name, chainText);
      allPetNames.add(name);
    }

    const unionGroups = new Set();
    for (const name of names) {
      const groups = groupsByPet.get(name);
      if (!groups) continue;
      for (const group of groups) unionGroups.add(group);
    }

    if (unionGroups.size > 0) {
      for (const name of names) {
        if (!groupsByPet.has(name)) groupsByPet.set(name, new Set());
        const target = groupsByPet.get(name);
        for (const group of unionGroups) target.add(group);
      }
    }
  }

  return {
    groupsByPet,
    stageToBase,
    stageToFinal,
    stageToChainText,
    baseToMembers,
    baseToChain,
    baseToChains,
    allPetNames,
  };
}

export function buildShinyPetSet({
  shinySeedPets = [],
  groupIndex,
  normalizeBreedingName = (name) => String(name ?? "").trim(),
} = {}) {
  const shinySet = new Set();

  if (!groupIndex) return shinySet;

  const {
    allPetNames = new Set(),
    stageToBase = new Map(),
    stageToFinal = new Map(),
    baseToChains = new Map(),
  } = groupIndex;

  for (const rawName of Array.isArray(shinySeedPets) ? shinySeedPets : []) {
    const seedName = normalizeBreedingName(rawName);
    if (!seedName || !allPetNames.has(seedName)) continue;

    const base = stageToBase.get(seedName) || seedName;
    const chains = baseToChains.get(base) || [];

    if (chains.length > 0) {
      for (const chain of chains) {
        if (!Array.isArray(chain) || chain.length === 0) continue;

        const idx = chain.indexOf(seedName);
        if (idx === -1) continue;

        for (let i = idx; i < chain.length; i += 1) {
          const name = chain[i];
          if (allPetNames.has(name)) shinySet.add(name);
        }
      }
    }

    if (!shinySet.has(seedName)) {
      const finalName = stageToFinal.get(seedName) || seedName;
      if (allPetNames.has(finalName)) shinySet.add(finalName);
    }
  }

  return shinySet;
}

export function hasAnyAttribute(targetAttributes = [], activeAttribute = "") {
  if (!activeAttribute) return true;
  const list = Array.isArray(targetAttributes) ? targetAttributes : [];
  return list.includes(activeAttribute);
}
