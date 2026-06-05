import { useState } from 'react';
import { FOOD_ACTIONS, FOOD_GROUPS, UNIT_OPTIONS, defaultExpiryDate, emojiMap, findSubcategory } from '../constants/food';
import { Input, Title } from '../ui/common';
import { c, cx } from '../ui/styles';

export function FoodScreen({
  user,
  foods,
  foodForm,
  foodAction,
  selectedFood,
  selectedFoodIds,
  showFoodList,
  selectedGroup,
  setFoodForm,
  pickFood,
  saveFood,
  deleteFood,
  deleteConfirmOpen,
  setDeleteConfirmOpen,
  selectFood,
  startFoodAction,
  requireLogin,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState('category');
  const [pickerCategory, setPickerCategory] = useState(foodForm.category);
  const [pickerSubcategory, setPickerSubcategory] = useState(foodForm.subcategory || selectedGroup.subcategories[0].label);
  const [searchForm, setSearchForm] = useState({ keyword: '', category: '전체', expiry: 'all' });
  const pickerGroup = FOOD_GROUPS.find((group) => group.label === pickerCategory) || FOOD_GROUPS[0];
  const pickerSub = findSubcategory(pickerGroup, pickerSubcategory);
  const sortedFoods = sortFoods(foods);
  const visibleFoods = foodAction === 'search' ? filterFoods(sortedFoods, searchForm) : sortedFoods;

  return (
    <div className={c.stack}>
      <Title kicker="식료품" title="오늘 관리할 식료품" />
      <div className="grid grid-cols-5 gap-2">
        {FOOD_ACTIONS.map(([action, label, emoji]) => (
          <button
            key={action}
            type="button"
            className={cx('grid h-14 place-items-center rounded-lg border border-slate-200 bg-white text-[11px] font-black text-slate-700 shadow-sm active:scale-95', foodAction === action && 'border-emerald-600 bg-emerald-50 text-emerald-900')}
            onClick={() => startFoodAction(action)}
          >
            <span className="text-xl">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {user && (foodAction === 'add' || foodAction === 'edit') && (
        <form className={cx(c.card, 'grid gap-4')} onSubmit={saveFood}>
          <div className="mb-1 grid grid-cols-[auto_1fr] items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-emerald-50 text-3xl">{foodForm.emoji}</span>
            <div><p className={c.kicker}>{foodAction === 'edit' ? '식료품 수정' : '식료품 추가'}</p><strong className="text-xl text-slate-950">{foodForm.itemName}</strong></div>
          </div>
          <button className="h-12 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-black text-emerald-900" type="button" onClick={() => {
            setPickerCategory(foodForm.category);
            setPickerSubcategory(foodForm.subcategory || selectedGroup.subcategories[0].label);
            setPickerStep('category');
            setPickerOpen(true);
          }}>
            {foodForm.emoji} 카테고리/식료품 선택
          </button>
          <div className="grid grid-cols-2 gap-3">
            <Input label="수량" value={foodForm.quantity} onChange={(value) => setFoodForm({ ...foodForm, quantity: value })} />
            <label className={c.label}>
              단위
              <select className={c.input} value={foodForm.unit} onChange={(event) => setFoodForm({ ...foodForm, unit: event.target.value })}>
                {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <div className="col-span-2">
              <Input
                label="소비기한"
                type="date"
                value={foodForm.noExpiry ? '' : foodForm.expiryDate}
                onChange={(value) => setFoodForm({ ...foodForm, expiryDate: value, noExpiry: false })}
              />
              <label className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <input
                  className="h-4 w-4 accent-emerald-700"
                  type="checkbox"
                  checked={!!foodForm.noExpiry}
                  onChange={(event) => setFoodForm({
                    ...foodForm,
                    noExpiry: event.target.checked,
                    expiryDate: event.target.checked ? '' : defaultDateFor(foodForm.category),
                  })}
                />
                소비기한을 모르겠어요
              </label>
            </div>
          </div>
          <button className={c.primary} type="submit">{foodAction === 'edit' ? '수정하기' : '추가하기'}</button>
        </form>
      )}

      {user && foodAction === 'delete' && (
        <div className={cx(c.card, 'grid justify-items-start gap-2')}>
          <div className="flex w-full items-center justify-between">
            <div>
              <strong className="text-emerald-800">삭제할 항목을 선택하세요</strong>
              <p className="m-0 mt-1 text-sm text-slate-500">선택 {selectedFoodIds.length}개</p>
            </div>
            <button
              className={cx('grid h-11 w-11 place-items-center rounded-lg text-xl', selectedFoodIds.length ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400')}
              type="button"
              disabled={!selectedFoodIds.length || deleteConfirmOpen}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              🗑️
            </button>
          </div>
        </div>
      )}

      {user && foodAction === 'search' && (
        <div className={cx(c.card, 'grid gap-3')}>
          <div className="grid grid-cols-[auto_1fr] items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-2xl">🔍</span>
            <div>
              <strong className="text-slate-950">식료품 검색</strong>
              <p className="m-0 mt-1 text-sm text-slate-500">이름, 카테고리, 소비기한 상태로 좁혀볼 수 있어요.</p>
            </div>
          </div>
          <Input
            label="검색어"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className={c.label}>
              카테고리
              <select className={c.input} value={searchForm.category} onChange={(event) => setSearchForm({ ...searchForm, category: event.target.value })}>
                {['전체', ...FOOD_GROUPS.map((group) => group.label)].map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className={c.label}>
              소비기한 상태
              <select className={c.input} value={searchForm.expiry} onChange={(event) => setSearchForm({ ...searchForm, expiry: event.target.value })}>
                <option value="all">전체</option>
                <option value="expired">기한 지남</option>
                <option value="soon">임박</option>
                <option value="fresh">여유</option>
                <option value="none">기한 없음</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {!user && (
        <div className={cx(c.card, 'grid grid-cols-[auto_1fr] gap-3')}>
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-2xl">🔐</span>
          <div><strong>식료품 관리는 로그인 후 사용할 수 있어요</strong><p className="m-0 mt-1 text-sm text-slate-500">추가, 수정, 삭제, 조회 메뉴를 누르면 로그인 화면으로 이동합니다.</p></div>
        </div>
      )}

      {showFoodList ? (
      <div className="grid gap-3">
        {visibleFoods.map((food, index) => {
          const name = food.itemName || food.name || food.item_name || '식료품';
          const status = getExpiryStatus(food.expiryDate || food.expiry_date);
          const deleteSelected = selectedFoodIds.includes(food.id);
          return (
            <article
              key={food.id || `${name}-${index}`}
              className={cx(
                c.row,
                status.cardClass,
                selectedFood?.id && selectedFood.id === food.id && 'border-emerald-500 bg-emerald-50',
                deleteSelected && 'border-rose-600 bg-rose-100',
              )}
              onClick={() => user ? selectFood(food) : requireLogin('foods')}
            >
              {foodAction === 'delete' ? (
                <span className={cx('grid h-6 w-6 place-items-center rounded border text-sm font-black', deleteSelected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-500 bg-white text-transparent')}>✓</span>
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-3xl">{food.emoji || emojiMap[name] || '🍽️'}</span>
              )}
              <div>
                <strong className={cx('text-slate-950', foodAction === 'delete' && deleteSelected && 'text-emerald-800')}>{name}</strong>
                <p className="m-0 text-sm text-slate-500">{food.category || '식료품'} · {food.subcategory ? `${food.subcategory} · ` : ''}{food.quantity || 1}{food.unit || '개'}</p>
              </div>
              <small className={cx('text-right text-xs font-black', status.textClass)}>
                <span className="block">{status.label}</span>
                <span className="block font-bold">{status.dateLabel}</span>
              </small>
            </article>
          );
        })}
        {!visibleFoods.length && (
          <div className={`${c.card} text-sm font-bold text-slate-500`}>
            {foodAction === 'search' ? '검색 조건에 맞는 식료품이 없습니다.' : '등록된 식료품이 없습니다.'}
          </div>
        )}
      </div>
      ) : (
        <div className={cx(c.card, 'grid justify-items-start gap-2')}>
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-2xl">🔎</span>
          <strong>조회 버튼을 눌러 식료품을 확인하세요</strong>
          <p className="m-0 text-sm text-slate-500">등록된 식료품 목록은 조회 모드에서만 표시됩니다.</p>
        </div>
      )}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="max-h-[82vh] w-full max-w-[390px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <strong className="text-slate-950">식료품 선택</strong>
              <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-bold" type="button" onClick={() => setPickerOpen(false)}>닫기</button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-4">
              <PickerProgress
                step={pickerStep}
                category={pickerCategory}
                subcategory={pickerSubcategory}
                onCategory={() => setPickerStep('category')}
                onSubcategory={() => setPickerStep('subcategory')}
              />

              {pickerStep === 'category' && (
                <section className="mb-5">
                  <h3 className="mb-3 text-sm font-black text-emerald-800">큰 카테고리를 선택하세요</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {FOOD_GROUPS.map((group) => (
                      <button
                        key={group.label}
                        type="button"
                        className={cx('flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 active:scale-95', pickerCategory === group.label && 'border-slate-950 bg-slate-950 text-white')}
                        onClick={() => {
                          setPickerCategory(group.label);
                          setPickerSubcategory(group.subcategories[0].label);
                          setPickerStep('subcategory');
                        }}
                      >
                        <span className="text-2xl">{group.subcategories[0]?.items[0]?.[1] || '🍽️'}</span>
                        {group.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {pickerStep === 'subcategory' && (
                <section className="mb-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="m-0 text-sm font-black text-emerald-800">{pickerGroup.label}의 중간 카테고리</h3>
                    <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-black text-slate-600" type="button" onClick={() => setPickerStep('category')}>이전</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {pickerGroup.subcategories.map((subcategory) => (
                      <button
                        key={subcategory.label}
                        type="button"
                        className={cx('flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-900 active:scale-95', pickerSubcategory === subcategory.label && 'border-emerald-700 bg-emerald-700 text-white')}
                        onClick={() => {
                          setPickerSubcategory(subcategory.label);
                          setPickerStep('item');
                        }}
                      >
                        <span className="text-2xl">{subcategory.items[0]?.[1] || '🍽️'}</span>
                        {subcategory.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {pickerStep === 'item' && (
              <section className="mb-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="m-0 text-sm font-black text-emerald-800">{pickerSub.label}에서 종류 선택</h3>
                    <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-black text-slate-600" type="button" onClick={() => setPickerStep('subcategory')}>이전</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {pickerSub.items.map(([name, emoji]) => (
                      <button
                        key={name}
                        type="button"
                        className={cx('flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 active:scale-95', name === foodForm.itemName && 'border-emerald-600 bg-emerald-50 text-emerald-900')}
                        onClick={() => {
                          pickFood(pickerGroup, name, emoji);
                          setPickerOpen(false);
                        }}
                      >
                        <span className="text-3xl">{emoji}</span>
                        {name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PickerProgress({ step, category, subcategory, onCategory, onSubcategory }) {
  const items = [
    ['category', '큰 카테고리', category, onCategory],
    ['subcategory', '중간 카테고리', subcategory, onSubcategory],
    ['item', '식료품 종류', '', null],
  ];

  return (
    <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
      {items.map(([id, label, value, onClick]) => {
        const active = step === id;
        const done = id === 'category' || (id === 'subcategory' && step === 'item');
        return (
          <button
            key={id}
            type="button"
            disabled={!onClick || (!done && !active)}
            className={cx('min-h-12 rounded-lg px-2 py-2 text-left text-[11px] font-black', active ? 'bg-slate-950 text-white' : done ? 'bg-white text-slate-800' : 'text-slate-400')}
            onClick={onClick || undefined}
          >
            <span className="block text-[10px] opacity-70">{label}</span>
            <span className="block truncate">{value || (active ? '선택 중' : '다음')}</span>
          </button>
        );
      })}
    </div>
  );
}

function defaultDateFor(category) {
  return defaultExpiryDate(category || '기타');
}

function filterFoods(foods, searchForm) {
  const keyword = searchForm.keyword.trim().toLowerCase();
  return foods.filter((food) => {
    const name = food.itemName || food.name || food.item_name || '';
    const category = food.category || '';
    const subcategory = food.subcategory || '';
    const status = getExpiryStatus(food.expiryDate || food.expiry_date);
    const text = `${name} ${category} ${subcategory}`.toLowerCase();
    const keywordMatch = !keyword || text.includes(keyword);
    const categoryMatch = searchForm.category === '전체' || category === searchForm.category;
    const expiryMatch = searchForm.expiry === 'all' || status.key === searchForm.expiry;
    return keywordMatch && categoryMatch && expiryMatch;
  });
}

function sortFoods(foods) {
  return [...foods].sort((left, right) => {
    const leftTime = getDateTime(left.expiryDate || left.expiry_date);
    const rightTime = getDateTime(right.expiryDate || right.expiry_date);
    if (leftTime !== rightTime) return leftTime - rightTime;
    const leftName = left.itemName || left.name || left.item_name || '';
    const rightName = right.itemName || right.name || right.item_name || '';
    return leftName.localeCompare(rightName, 'ko');
  });
}

function getDateTime(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getExpiryStatus(value) {
  if (!value) {
    return {
      key: 'none',
      label: '기한 없음',
      dateLabel: '소비기한 없음',
      cardClass: 'border-slate-200 bg-white',
      textClass: 'text-slate-400',
    };
  }

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) {
    return {
      key: 'none',
      label: '기한 없음',
      dateLabel: '소비기한 없음',
      cardClass: 'border-slate-200 bg-white',
      textClass: 'text-slate-400',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - today) / 86400000);

  if (daysLeft < 0) {
    return {
      key: 'expired',
      label: '기한 지남',
      dateLabel: value,
      cardClass: 'border-rose-500 bg-rose-50',
      textClass: 'text-rose-700',
    };
  }

  if (daysLeft <= 3) {
    return {
      key: 'soon',
      label: daysLeft === 0 ? '오늘까지' : `D-${daysLeft}`,
      dateLabel: value,
      cardClass: 'border-amber-400 bg-amber-50',
      textClass: 'text-amber-700',
    };
  }

  return {
    key: 'fresh',
    label: `D-${daysLeft}`,
    dateLabel: value,
    cardClass: 'border-emerald-200 bg-emerald-50',
    textClass: 'text-emerald-700',
  };
}
