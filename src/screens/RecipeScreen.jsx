import { useState } from 'react';
import { SimpleScreen, Title } from '../ui/common';
import { c, cx } from '../ui/styles';

export function RecipeScreen({ user, foods, recipes, loading, onLogin }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  if (!user) return <SimpleScreen title="레시피" icon="🍳" locked onLogin={onLogin} body="로그인 후 등록된 식료품으로 만들 수 있는 레시피를 확인할 수 있습니다." />;

  const ownedNames = Array.from(new Set((foods || []).map((food) => food.itemName || food.name || food.item_name).filter(Boolean)));

  return (
    <div className={c.stack}>
      <Title kicker="레시피" title="내 식료품으로 만들기" />

      <div className={cx(c.card, 'grid gap-3')}>
        <div>
          <strong className="text-slate-950">현재 등록된 식료품</strong>
          <p className="m-0 mt-1 text-sm text-slate-500">{ownedNames.length ? ownedNames.join(', ') : '등록된 식료품이 없습니다.'}</p>
        </div>
        <div className={cx('rounded-lg px-3 py-2 text-sm font-black', loading ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600')}>
          {loading ? '등록된 식료품으로 레시피를 자동 추천하는 중입니다.' : '레시피 탭에 들어오면 자동으로 추천됩니다.'}
        </div>
      </div>

      <div className="grid gap-3">
        {recipes.map((recipe, index) => {
          const missing = findMissingIngredients(recipe, ownedNames);
          const meta = getRecipeMeta(recipe);
          return (
            <button className={`${c.row} text-left`} type="button" key={recipe.RCP_SEQ || index} onClick={() => setSelectedRecipe(recipe)}>
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-3xl">🍳</span>
              <div>
                <strong>{recipe.RCP_NM || recipe.name || '레시피'}</strong>
                <p className="m-0 text-sm text-slate-500">{recipe.RCP_PAT2 || recipe.RCP_WAY2 || '추천 레시피'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-800">⏱️ {meta.timeLabel}</span>
                  <span className={cx('rounded-full px-2 py-1 text-[11px] font-black', meta.difficultyClass)}>{meta.difficultyIcon} {meta.difficulty}</span>
                </div>
                <p className={cx('m-0 mt-1 text-xs font-bold', missing.length ? 'text-rose-700' : 'text-emerald-700')}>
                  {missing.length ? `추가 구매 필요: ${missing.slice(0, 5).join(', ')}` : '추가 구매 없이 가능해 보여요'}
                </p>
              </div>
            </button>
          );
        })}
        {!recipes.length && (
          <div className={`${c.card} text-sm font-bold text-slate-500`}>
            {loading ? '추천 레시피를 불러오고 있습니다.' : '현재 식료품으로 찾은 추천 레시피가 아직 없습니다.'}
          </div>
        )}
      </div>
      {selectedRecipe && <RecipeDetail recipe={selectedRecipe} ownedNames={ownedNames} onClose={() => setSelectedRecipe(null)} />}
    </div>
  );
}

function RecipeDetail({ recipe, ownedNames, onClose }) {
  const manuals = getManuals(recipe);
  const missing = findMissingIngredients(recipe, ownedNames);
  const meta = getRecipeMeta(recipe);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="max-h-[86vh] w-full max-w-[390px] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <strong className="text-slate-950">{recipe.RCP_NM || recipe.name || '레시피'}</strong>
          <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-bold" type="button" onClick={onClose}>닫기</button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-4">
          {recipe.ATT_FILE_NO_MAIN && <img className="mb-4 h-44 w-full rounded-lg object-cover" src={recipe.ATT_FILE_NO_MAIN} alt={recipe.RCP_NM || '레시피'} />}
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            <Info label="종류" value={recipe.RCP_PAT2} />
            <Info label="방법" value={recipe.RCP_WAY2} />
            <Info label="예상 시간" value={meta.timeLabel} />
            <Info label="예상 난이도" value={meta.difficulty} />
            <Info label="열량" value={recipe.INFO_ENG ? `${recipe.INFO_ENG} kcal` : ''} />
            <Info label="나트륨" value={recipe.INFO_NA ? `${recipe.INFO_NA} mg` : ''} />
          </div>

          <section className="mb-4">
            <h3 className="mb-2 text-sm font-black text-emerald-800">추가 구매 필요</h3>
            <p className={cx('m-0 rounded-lg p-3 text-sm', missing.length ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800')}>
              {missing.length ? missing.join(', ') : '현재 등록된 식료품으로 충분해 보여요.'}
            </p>
          </section>

          <section className="mb-4">
            <h3 className="mb-2 text-sm font-black text-emerald-800">재료</h3>
            <p className="m-0 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{recipe.RCP_PARTS_DTLS || '재료 정보가 없습니다.'}</p>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-black text-emerald-800">조리법</h3>
            <ol className="grid gap-2">
              {(manuals.length ? manuals : ['조리법 정보가 없습니다.']).map((manual, index) => (
                <li className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700" key={`${manual}-${index}`}>{index + 1}. {manual}</li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function getManuals(recipe) {
  return Object.entries(recipe)
    .filter(([key, value]) => /^MANUAL\d+$/.test(key) && value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
}

function getRecipeMeta(recipe) {
  const directTime = recipe.COOKING_TIME || recipe.CKG_TIME || recipe.RCP_TIME || recipe.INFO_TIME;
  const directDifficulty = recipe.DIFFICULTY || recipe.CKG_DODF_NM || recipe.RCP_LEVEL;
  const manuals = getManuals(recipe);
  const ingredients = parseIngredients(recipe.RCP_PARTS_DTLS || '');
  const method = String(recipe.RCP_WAY2 || '');
  const stepCount = manuals.length || 3;
  const ingredientCount = ingredients.length || 4;
  const baseByMethod = [
    ['튀기기', 30],
    ['찌기', 30],
    ['굽기', 25],
    ['끓이기', 25],
    ['볶기', 20],
    ['무침', 15],
  ];
  const base = baseByMethod.find(([name]) => method.includes(name))?.[1] || 20;
  const estimated = base + Math.max(0, stepCount - 4) * 4 + Math.max(0, ingredientCount - 6) * 2;
  const minutes = Math.min(90, Math.max(10, Math.round(estimated / 5) * 5));
  const difficultyScore =
    (stepCount >= 8 ? 1 : 0)
    + (ingredientCount >= 10 ? 1 : 0)
    + (/튀기기|굽기|찌기/.test(method) ? 1 : 0);
  const difficulty = directDifficulty || (difficultyScore >= 2 ? '어려움' : difficultyScore === 1 ? '보통' : '쉬움');
  const difficultyClass = difficulty.includes('어려')
    ? 'bg-rose-50 text-rose-800'
    : difficulty.includes('보통')
      ? 'bg-amber-50 text-amber-800'
      : 'bg-blue-50 text-blue-800';
  const difficultyIcon = difficulty.includes('어려') ? '🔥' : difficulty.includes('보통') ? '⭐' : '🌱';

  return {
    timeLabel: directTime ? String(directTime) : `약 ${minutes}분`,
    difficulty,
    difficultyClass,
    difficultyIcon,
  };
}

function findMissingIngredients(recipe, ownedNames) {
  const owned = ownedNames.map((name) => normalize(name));
  const ingredients = parseIngredients(recipe.RCP_PARTS_DTLS || '');
  return ingredients.filter((ingredient) => !owned.some((name) => normalize(ingredient).includes(name) || name.includes(normalize(ingredient)))).slice(0, 8);
}

function parseIngredients(text) {
  const noise = ['재료', '양념', '소스', '약간', '적당량', '기호', '물', '소금', '후추'];
  return text
    .replace(/\([^)]*\)/g, ',')
    .split(/[,·ㆍ\n]/)
    .map((item) => item.replace(/[0-9./~㎖mlgkg컵큰작은술스푼\s]+/gi, '').trim())
    .filter((item) => item.length >= 2)
    .filter((item) => !noise.some((word) => item.includes(word)))
    .slice(0, 20);
}

function normalize(value) {
  return String(value || '').replace(/\s/g, '').toLowerCase();
}

function Info({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="m-0 text-xs font-black text-slate-400">{label}</p><strong className="text-slate-800">{value || '-'}</strong></div>;
}
