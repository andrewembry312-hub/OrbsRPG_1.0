import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function stripCommentsPreserveStrings(input) {
  let out = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  while (i < input.length) {
    const ch = input[i];
    const next = i + 1 < input.length ? input[i + 1] : '';

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += ch;
      }
      i += 1;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (inSingle) {
      out += ch;
      if (!escaped && ch === "'") inSingle = false;
      escaped = !escaped && ch === '\\';
      i += 1;
      continue;
    }

    if (inDouble) {
      out += ch;
      if (!escaped && ch === '"') inDouble = false;
      escaped = !escaped && ch === '\\';
      i += 1;
      continue;
    }

    if (inTemplate) {
      out += ch;
      if (!escaped && ch === '`') inTemplate = false;
      escaped = !escaped && ch === '\\';
      i += 1;
      continue;
    }

    // Not in string/comment
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      escaped = false;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      escaped = false;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      escaped = false;
      out += ch;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function extractBracedLiteral(source, marker) {
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error(`Marker not found: ${marker}`);

  const braceStart = source.indexOf('{', idx);
  if (braceStart < 0) throw new Error(`Could not find '{' after marker: ${marker}`);

  let i = braceStart;
  let depth = 0;

  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  while (i < source.length) {
    const ch = source[i];
    const next = i + 1 < source.length ? source[i + 1] : '';

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i += 1;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (inSingle) {
      if (!escaped && ch === "'") inSingle = false;
      escaped = !escaped && ch === '\\';
      i += 1;
      continue;
    }

    if (inDouble) {
      if (!escaped && ch === '"') inDouble = false;
      escaped = !escaped && ch === '\\';
      i += 1;
      continue;
    }

    if (inTemplate) {
      if (!escaped && ch === '`') inTemplate = false;
      escaped = !escaped && ch === '\\';
      i += 1;
      continue;
    }

    // Not in string/comment
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      escaped = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      escaped = false;
      i += 1;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      escaped = false;
      i += 1;
      continue;
    }

    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(braceStart, i + 1);
        return literal;
      }
    }

    i += 1;
  }

  throw new Error(`Unterminated braced literal after marker: ${marker}`);
}

function evalObjectLiteral(objLiteralText, label) {
  const cleaned = stripCommentsPreserveStrings(objLiteralText);
  try {
    return vm.runInNewContext(`(${cleaned})`, {}, { timeout: 1000 });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`Failed to eval ${label}: ${msg}`);
  }
}

function mdEscape(text) {
  return String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function fmtNum(n) {
  if (n === 0) return '0';
  if (!n) return '';
  if (typeof n !== 'number') return String(n);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, '');
}

function buildMarkdown({ abilities, abilityMeta }) {
  const generatedAt = new Date().toISOString();
  const abilityList = Object.values(abilities);

  const categoriesPreferredOrder = [
    'Weapons - Destruction Staff',
    'Weapons - Healing Staff',
    'Weapons - Melee',
    'Mage - Exclusive',
    'Knight - Exclusive',
    'Warrior - Exclusive',
    'Tank - Exclusive',
    'Guild - Assault',
    'Guild - Support',
    'Restoration',
    'Arcane Arts',
  ];

  const categories = new Map();
  for (const ab of abilityList) {
    const cat = ab.category || 'Uncategorized';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat).push(ab);
  }

  const categoryNames = Array.from(categories.keys());
  categoryNames.sort((a, b) => {
    const ai = categoriesPreferredOrder.indexOf(a);
    const bi = categoriesPreferredOrder.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });

  let md = '';
  md += `# Ability Reference\n\n`;
  md += `Generated from:\n`;
  md += `- UI registry: orb-rpg/src/game/skills.js (export const ABILITIES)\n`;
  md += `- Runtime meta: orb-rpg/src/game/game.js (const ABILITY_META)\n\n`;
  md += `Generated: ${generatedAt}\n\n`;
  md += `## Summary\n\n`;
  md += `- UI abilities: **${Object.keys(abilities).length}**\n`;
  md += `- Runtime meta entries: **${Object.keys(abilityMeta).length}**\n\n`;
  md += `Notes:\n`;
  md += `- Not every UI ability has a runtime meta entry (and vice versa).\n`;
  md += `- IDs like \`shoulder_charge\` may be UI/runtime aliases of a similarly named skill.\n\n`;

  md += `## Abilities (by category)\n\n`;

  for (const cat of categoryNames) {
    const list = categories.get(cat) ?? [];
    list.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    md += `### ${cat}\n\n`;
    md += `| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |\n`;
    md += `|---|---|---|---|---:|---:|---:|---:|---:|---|---|\n`;

    for (const ab of list) {
      const id = ab.id;
      const rt = abilityMeta?.[id];
      const rtBits = [];
      if (rt?.kind) rtBits.push(`kind:${rt.kind}`);
      if (rt?.dmg != null) rtBits.push(`dmg:${fmtNum(rt.dmg)}`);
      if (rt?.type) rtBits.push(`rtType:${rt.type}`);
      if (rt?.element) rtBits.push(`elem:${rt.element}`);
      const runtime = rtBits.length ? rtBits.join(', ') : '';

      const target = ab.target || ab.targetType || '';

      md += `| ${mdEscape(id)} | ${mdEscape(ab.name || '')} | ${mdEscape(ab.type || '')} | ${mdEscape(target)} | ${fmtNum(ab.mana)} | ${fmtNum(ab.cd)} | ${fmtNum(ab.castTime)} | ${fmtNum(ab.range)} | ${fmtNum(ab.radius)} | ${mdEscape(ab.desc || '')} | ${mdEscape(runtime)} |\n`;
    }

    md += `\n`;

    // Add details section for this category (kept compact)
    md += `#### ${cat} — details\n\n`;
    for (const ab of list) {
      const id = ab.id;
      const rt = abilityMeta?.[id];

      md += `- **${mdEscape(ab.name || id)}** (\`${id}\`) — ${mdEscape(ab.desc || '')}`;
      const extra = [];
      if (ab.details) extra.push(mdEscape(ab.details));
      if (ab.scaling) extra.push(`Scaling: ${mdEscape(ab.scaling)}`);
      if (ab.buffs?.length) extra.push(`Buffs/Debuffs: ${ab.buffs.map(mdEscape).join(', ')}`);
      if (ab.dots?.length) extra.push(`DoTs: ${ab.dots.map(mdEscape).join(', ')}`);

      const rtExtra = [];
      if (rt) {
        if (rt.range != null) rtExtra.push(`range:${fmtNum(rt.range)}`);
        if (rt.cost != null) rtExtra.push(`cost:${fmtNum(rt.cost)}`);
        if (rt.cd != null) rtExtra.push(`cd:${fmtNum(rt.cd)}`);
        if (rt.dmg != null) rtExtra.push(`dmg:${fmtNum(rt.dmg)}`);
        if (rt.kind) rtExtra.push(`kind:${rt.kind}`);
      }
      if (rtExtra.length) extra.push(`Runtime: ${rtExtra.join(', ')}`);

      if (extra.length) md += `\n  - ${extra.join(' | ')}`;
      md += `\n`;
    }
    md += `\n`;
  }

  return md;
}

function main() {
  // Expected to be run from the orb-rpg folder.
  const repoRoot = path.resolve(process.cwd());
  const skillsPath = path.join(repoRoot, 'src', 'game', 'skills.js');
  const gamePath = path.join(repoRoot, 'src', 'game', 'game.js');

  const skillsSrc = readUtf8(skillsPath);
  const gameSrc = readUtf8(gamePath);

  const abilitiesLiteral = extractBracedLiteral(skillsSrc, 'export const ABILITIES');
  const abilities = evalObjectLiteral(abilitiesLiteral, 'ABILITIES');

  const metaLiteral = extractBracedLiteral(gameSrc, 'const ABILITY_META');
  const abilityMeta = evalObjectLiteral(metaLiteral, 'ABILITY_META');

  const md = buildMarkdown({ abilities, abilityMeta });

  const outPath = path.join(repoRoot, 'docs', 'ABILITY_REFERENCE.md');
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`Wrote ${outPath}`);
}

main();
