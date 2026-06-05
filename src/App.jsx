import { useEffect, useMemo, useState } from 'react';
import { defaultExpiryDate, emojiMap, findFoodGroup, firstFood } from './constants/food';
import { api, clearSession, getToken, saveSession } from './lib/api';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  buildExpiryNotificationBody,
  getAddressRegion,
  getExpiryTargets,
  isValidBusinessNumber,
  normalizeBusinessNumber,
} from './lib/appUtils';
import { AddressNoticeModal, DetailAddressModal, PostcodeModal } from './components/AddressModals';
import { AuthScreen } from './screens/AuthScreen';
import { FoodScreen } from './screens/FoodScreen';
import { RecipeScreen } from './screens/RecipeScreen';
import { SalesScreen } from './screens/SalesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { hasNotificationPermission, showAppNotification } from './lib/notifications';
import { AppHeader, BottomNavigation, ConfirmDialog, LoadingOverlay } from './ui/AppShell';
import { c } from './ui/styles';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [started, setStarted] = useState(false);
  const [screen, setScreen] = useState('foods');
  const [pendingScreen, setPendingScreen] = useState('foods');
  const [authMode, setAuthMode] = useState('login');
  const [message, setMessage] = useState('');
  const [foods, setFoods] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [sales, setSales] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [dataLoadingCount, setDataLoadingCount] = useState(0);
  const [lastRecipeKey, setLastRecipeKey] = useState('');
  const [lastExpiryNotificationKey, setLastExpiryNotificationKey] = useState('');
  const [foodAction, setFoodAction] = useState('view');
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedFoodIds, setSelectedFoodIds] = useState([]);
  const [showFoodList, setShowFoodList] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [registeredAddress, setRegisteredAddress] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [addressNoticeOpen, setAddressNoticeOpen] = useState(false);
  const [detailAddressOpen, setDetailAddressOpen] = useState(false);
  const [addressDeleteConfirmOpen, setAddressDeleteConfirmOpen] = useState(false);
  const [pendingAddress, setPendingAddress] = useState(null);
  const [detailAddressInput, setDetailAddressInput] = useState('');
  const [authForm, setAuthForm] = useState({
    userId: '',
    password: '',
    name: '',
    businessName: '',
    businessOwnerName: '',
    businessNumber: '',
    businessCategory: '마트',
    postcode: '',
    address: '',
    detailAddress: '',
  });
  const [foodForm, setFoodForm] = useState({
    ...firstFood,
    quantity: '1',
    unit: '개',
    expiryDate: defaultExpiryDate(firstFood.category),
    noExpiry: false,
  });

  const selectedGroup = useMemo(
    () => findFoodGroup(foodForm.category),
    [foodForm.category],
  );
  const navItems = user?.role === 'seller'
    ? [['foods', '식료품', '🧺'], ['sales', '할인', '🏷️'], ['settings', '설정', '⚙️']]
    : [['foods', '식료품', '🧺'], ['sales', '할인', '🏷️'], ['recipes', '레시피', '🍳'], ['settings', '설정', '⚙️']];
  const recipeKey = useMemo(
    () => Array.from(new Set(foods.map((food) => food.itemName || food.name || food.item_name).filter(Boolean))).slice(0, 4).join('|'),
    [foods],
  );

  useEffect(() => {
    if (!getToken()) return;
    api('/api/me')
      .then((savedUser) => {
        setUser(savedUser);
        setStarted(true);
        setScreen('foods');
      })
      .catch(() => {
        clearSession();
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setFoods([]);
      setSales([]);
      setNotifications([]);
      setRegisteredAddress(null);
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
      return;
    }

    loadAddress();
    loadNotificationSettings();
    loadFoods();
    if (user.role === 'seller') loadSales(null);
    loadNotifications();
  }, [user]);

  useEffect(() => {
    if (screen !== 'recipes' || !user || !recipeKey || recipeKey === lastRecipeKey || recipesLoading) return;
    recommendRecipes();
  }, [screen, user, recipeKey, lastRecipeKey, recipesLoading]);

  useEffect(() => {
    sendDailyExpiryNotification();
  }, [user, foods, notificationSettings]);

  useEffect(() => {
    if (!user || user.role !== 'consumer') return undefined;
    const timer = window.setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [user, registeredAddress, notificationSettings]);

  async function loadFoods() {
    setDataLoadingCount((count) => count + 1);
    try {
      const data = await api('/api/foods');
      setFoods(Array.isArray(data) ? data : []);
    } catch {
      setFoods([]);
    } finally {
      setDataLoadingCount((count) => Math.max(0, count - 1));
    }
  }

  async function loadSales(addressOverride = registeredAddress) {
    setDataLoadingCount((count) => count + 1);
    try {
      const region = user?.role === 'seller' ? '' : getAddressRegion(addressOverride);
      const path = region ? `/api/sales?region=${encodeURIComponent(region)}` : '/api/sales';
      const data = await api(path);
      setSales(Array.isArray(data) ? data : []);
    } catch {
      setSales([]);
    } finally {
      setDataLoadingCount((count) => Math.max(0, count - 1));
    }
  }

  async function loadAddress() {
    try {
      const data = await api('/api/me/address');
      if (data?.address) {
        const nextAddress = {
          postcode: data.postcode,
          address: data.address,
          detailAddress: data.detailAddress || '',
        };
        setRegisteredAddress(nextAddress);
        if (user?.role !== 'seller') loadSales(nextAddress);
        return;
      }
    } catch {
      setMessage('주소 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
    setRegisteredAddress(null);
  }

  async function loadNotificationSettings() {
    try {
      const data = await api('/api/me/notification-settings');
      setNotificationSettings(mapNotificationSettings(data));
    } catch {
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    }
  }

  async function loadNotifications() {
    if (!user) return;
    try {
      const data = await api('/api/notifications');
      const items = Array.isArray(data) ? data : [];
      setNotifications(items);
      await notifyUnreadDiscounts(items);
    } catch {
      setNotifications([]);
    }
  }

  function requireLogin(nextScreen = screen, nextAuthMode = 'login') {
    if (user) return true;
    setStarted(true);
    setAuthMode(nextAuthMode);
    setScreen('auth');
    setMessage('로그인 후 이용할 수 있습니다.');
    setPendingScreen(nextScreen);
    return false;
  }

  async function login(event) {
    event.preventDefault();
    setMessage('');
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userId: authForm.userId, password: authForm.password }),
      });
      saveSession(data);
      setUser(data.user);
      setStarted(true);
      setScreen(pendingScreen || 'foods');
      setPendingScreen('foods');
      setMessage('로그인되었습니다.');
      loadFoods();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function signup(role) {
    const userId = authForm.userId.trim();
    const password = authForm.password.trim();
    const name = authForm.name.trim();

    if (!userId) return setMessage('아이디를 입력해 주세요.');
    if (userId.length < 4) return setMessage('아이디는 4자 이상 입력해 주세요.');
    if (!password) return setMessage('비밀번호를 입력해 주세요.');
    if (password.length < 6) return setMessage('비밀번호는 6자 이상 입력해 주세요.');
    if (!name) return setMessage('이름을 입력해 주세요.');
    if (role === 'seller') {
      if (!authForm.businessNumber.trim()) return setMessage('사업자번호를 입력해 주세요.');
      if (!isValidBusinessNumber(authForm.businessNumber)) return setMessage('사업자번호 형식이 올바르지 않습니다. 숫자 10자리를 확인해 주세요.');
      if (!authForm.businessName.trim()) return setMessage('상호명을 입력해 주세요.');
      if (!authForm.businessOwnerName.trim()) return setMessage('사업자 이름을 입력해 주세요.');
      if (!authForm.address.trim()) return setMessage('사업장 주소를 등록해 주세요.');
    }

    setMessage('');
    const body = {
      userId,
      password,
      name,
      businessName: authForm.businessName.trim(),
      businessOwnerName: authForm.businessOwnerName.trim(),
      businessNumber: normalizeBusinessNumber(authForm.businessNumber),
      businessCategory: authForm.businessCategory,
    };
    if (role === 'seller') {
      Object.assign(body, {
        postcode: authForm.postcode,
        address: authForm.address,
        detailAddress: authForm.detailAddress,
        latitude: 37.5665,
        longitude: 126.978,
      });
    }
    try {
      const check = await api(`/api/auth/check-id?userId=${encodeURIComponent(userId)}`);
      if (!check.available) {
        setMessage('이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.');
        return;
      }
      const data = await api(`/api/auth/signup/${role}`, { method: 'POST', body: JSON.stringify(body) });
      saveSession(data);
      setUser(data.user);
      setStarted(true);
      setScreen('foods');
      setMessage('가입이 완료되었습니다.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveFood(event) {
    event.preventDefault();
    if (!requireLogin('foods')) return;
    const quantity = Number(foodForm.quantity);
    if (!foodForm.itemName) return setMessage('식료품을 선택해 주세요.');
    if (!quantity || quantity <= 0) return setMessage('수량은 0보다 크게 입력해 주세요.');
    if (!foodForm.noExpiry && !foodForm.expiryDate) return setMessage('소비기한을 선택하거나 소비기한 없음을 체크해 주세요.');
    if (!foodForm.noExpiry && foodForm.expiryDate < new Date().toISOString().slice(0, 10)) {
      return setMessage('소비기한은 오늘 또는 이후 날짜로 선택해 주세요.');
    }
    const isEdit = foodAction === 'edit' && selectedFood?.id;
    try {
      await api(isEdit ? `/api/foods/${selectedFood.id}` : '/api/foods', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({
          itemName: foodForm.itemName,
          name: foodForm.itemName,
          category: foodForm.category,
          subcategory: foodForm.subcategory,
          emoji: foodForm.emoji,
          quantity,
          unit: foodForm.unit,
          price: 0,
          expiryDate: foodForm.noExpiry ? null : foodForm.expiryDate,
        }),
      });
      setMessage(`${foodForm.emoji} ${foodForm.itemName}을 ${isEdit ? '수정' : '추가'}했습니다.`);
      setFoodAction('view');
      setSelectedFood(null);
      loadFoods();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteFood() {
    if (!requireLogin('foods')) return;
    if (!selectedFoodIds.length) {
      setMessage('삭제할 식료품을 먼저 선택해 주세요.');
      return;
    }
    try {
      await Promise.all(selectedFoodIds.map((id) => api(`/api/foods/${id}`, { method: 'DELETE' })));
      setMessage(`${selectedFoodIds.length}개 식료품을 삭제했습니다.`);
      setSelectedFood(null);
      setSelectedFoodIds([]);
      setDeleteConfirmOpen(false);
      loadFoods();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createSale(payload) {
    try {
      await api('/api/sales', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('할인 정보를 등록했습니다. 같은 지역 소비자에게 알림을 보냈습니다.');
      loadSales();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteSales(ids) {
    try {
      await Promise.all(ids.map((id) => api(`/api/sales/${id}`, { method: 'DELETE' })));
      setMessage(`${ids.length}개의 할인 정보를 삭제했습니다.`);
      loadSales();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startFoodAction(action) {
    if (!requireLogin('foods')) return;
    setFoodAction(action);
    setShowFoodList(action === 'view' || action === 'edit' || action === 'delete' || action === 'search');
    if (action === 'add') {
      setSelectedFood(null);
      setSelectedFoodIds([]);
      setFoodForm({ ...firstFood, quantity: '1', unit: '개', expiryDate: defaultExpiryDate(firstFood.category), noExpiry: false });
    }
    if (action === 'edit' && !selectedFood) setMessage('목록에서 수정할 식료품을 먼저 선택해 주세요.');
    if (action === 'delete') setMessage('삭제할 식료품을 선택한 뒤 휴지통 버튼을 눌러 주세요.');
    if (action === 'search') setMessage('검색 조건에 맞는 식료품을 확인합니다.');
    if (action === 'view') setMessage('등록된 식료품 목록을 조회합니다.');
  }

  function selectFood(food) {
    const name = food.itemName || food.name || food.item_name || '식료품';
    const emoji = food.emoji || emojiMap[name] || '🍽️';
    if (foodAction === 'delete') {
      setSelectedFoodIds((current) => (
        current.includes(food.id) ? current.filter((id) => id !== food.id) : [...current, food.id]
      ));
      return;
    }

    setSelectedFood(food);
    setFoodForm({
      category: food.category || '기타',
      subcategory: food.subcategory || '',
      itemName: name,
      emoji,
      quantity: String(food.quantity || 1),
      unit: food.unit || '개',
      expiryDate: food.expiryDate || food.expiry_date || '',
      noExpiry: !(food.expiryDate || food.expiry_date),
    });
    setMessage(`${emoji} ${name}을 선택했습니다.`);
  }

  function pickFood(group, name, emoji) {
    const subcategory = group.subcategories.find((item) => item.items.some(([itemName]) => itemName === name))?.label || group.subcategories[0].label;
    setFoodForm((current) => ({
      ...current,
      category: group.label,
      subcategory,
      itemName: name,
      emoji,
      expiryDate: current.noExpiry ? '' : defaultExpiryDate(group.label),
    }));
  }

  async function recommendRecipes() {
    if (!requireLogin('recipes')) return;
    const names = Array.from(new Set(foods.map((food) => food.itemName || food.name || food.item_name).filter(Boolean))).slice(0, 4);
    if (!names.length) {
      setRecipes([]);
      setMessage('등록된 식료품을 먼저 조회하거나 추가해 주세요.');
      return;
    }

    setRecipesLoading(true);
    setDataLoadingCount((count) => count + 1);
    try {
      const results = await Promise.allSettled(names.map((name) => api(`/api/recipes?query=${encodeURIComponent(name)}`)));
      const rows = results
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value?.items || result.value?.recipes || result.value?.COOKRCP01?.row || []);
      const failedCount = results.filter((result) => result.status === 'rejected').length;
      const unique = new Map();
      rows.forEach((recipe) => {
        const key = recipe.RCP_SEQ || recipe.RCP_NM || JSON.stringify(recipe);
        if (!unique.has(key)) unique.set(key, recipe);
      });
      setRecipes(Array.from(unique.values()).slice(0, 20));
      setLastRecipeKey(names.join('|'));
      setMessage(
        rows.length
          ? `${names.join(', ')} 기준으로 만들 수 있는 레시피를 찾았습니다.${failedCount ? ` 일부 검색 ${failedCount}건은 건너뛰었습니다.` : ''}`
          : '현재 등록된 식료품으로 찾은 레시피가 없습니다.',
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setRecipesLoading(false);
      setDataLoadingCount((count) => Math.max(0, count - 1));
    }
  }

  function logout() {
    clearSession();
    setLogoutConfirmOpen(false);
    setUser(null);
    setRegisteredAddress(null);
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setStarted(false);
    setScreen('foods');
    setMessage('로그아웃되었습니다.');
  }

  function openLoginFromWelcome() {
    setStarted(true);
    setAuthMode('login');
    setScreen('auth');
    setPendingScreen('foods');
  }

  function requestAddressRegistration() {
    setAddressNoticeOpen(true);
  }

  function continueAddressRegistration() {
    setAddressNoticeOpen(false);
    openPostcode('settings');
  }

  function openPostcode(mode = 'settings') {
    if (!window.kakao?.Postcode) {
      setMessage('카카오 우편번호 스크립트를 불러오지 못했습니다.');
      return;
    }
    setPostcodeOpen(true);
    setTimeout(() => {
      new window.kakao.Postcode({
        oncomplete(data) {
          const nextAddress = {
            postcode: data.zonecode,
            address: data.roadAddress || data.jibunAddress,
            detailAddress: '',
          };
          setPostcodeOpen(false);
          if (mode === 'auth' || !user) {
            setAuthForm((current) => ({ ...current, ...nextAddress }));
            return;
          }
          setPendingAddress(nextAddress);
          setDetailAddressInput(registeredAddress?.detailAddress || '');
          setDetailAddressOpen(true);
        },
      }).embed(document.getElementById('postcode-layer'));
    }, 0);
  }

  async function saveDetailAddress() {
    if (!pendingAddress) return;
    const nextAddress = {
      ...pendingAddress,
      detailAddress: detailAddressInput.trim(),
    };
    setRegisteredAddress(nextAddress);
    setAuthForm((current) => ({ ...current, ...nextAddress }));
    setDetailAddressOpen(false);
    setPendingAddress(null);
    setDetailAddressInput('');

    if (user) {
      try {
      await api('/api/me/address', {
        method: 'PUT',
        body: JSON.stringify(nextAddress),
      });
        setMessage('위치를 등록했습니다.');
      } catch {
        setMessage('주소를 앱에는 저장했지만 서버 저장에 실패했습니다.');
      }
    }
    if (user?.role !== 'seller') loadSales(nextAddress);
  }

  async function deleteAddress() {
    if (!user) return;
    if (user.role === 'seller') {
      setMessage('판매자 계정은 위치 정보를 삭제할 수 없습니다. 위치 변경만 가능합니다.');
      setAddressDeleteConfirmOpen(false);
      return;
    }
    try {
      await api('/api/me/address', { method: 'DELETE' });
      setRegisteredAddress(null);
      setSales([]);
      setAddressDeleteConfirmOpen(false);
      setMessage('위치 정보를 삭제했습니다.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateNotificationSettings(nextSettings) {
    setNotificationSettings(nextSettings);
    try {
      const saved = await api('/api/me/notification-settings', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: nextSettings.enabled,
          notify1day: nextSettings.days.includes(1),
          notify3day: nextSettings.days.includes(3),
          notify7day: nextSettings.days.includes(7),
          discountEnabled: nextSettings.discountEnabled,
        }),
      });
      setNotificationSettings(mapNotificationSettings(saved));
    } catch (error) {
      setMessage(error.message);
      await loadNotificationSettings();
    }
  }

  async function testExpiryNotification() {
    if (!notificationSettings.enabled) {
      setMessage('알림 설정이 꺼져 있습니다. 먼저 알림을 켜 주세요.');
      return;
    }

    const targetDays = notificationSettings.days;
    if (!targetDays.length) {
      setMessage('알림 받을 날짜를 1일전, 3일전, 7일전 중에서 선택해 주세요.');
      return;
    }

    const targets = getExpiryTargets(foods, targetDays);
    const title = 'Food Manager 소비기한 알림 테스트';
    const body = buildExpiryNotificationBody(targets, targetDays);

    try {
      await recordExpiryNotifications(targetDays);
      await showAppNotification(title, body);
      setMessage('푸시 알림 테스트를 보냈습니다.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function notifyUnreadDiscounts(items) {
    if (!user || user.role !== 'consumer' || !notificationSettings.discountEnabled) return;
    const unread = items.filter((item) => item.type === 'discount' && !item.read);
    if (!unread.length) return;
    try {
      await showAppNotification('Food Manager 할인 알림', unread[0].body || '주변 매장에 새 할인 정보가 등록되었습니다.');
      await api('/api/notifications/read', { method: 'PUT' });
    } catch {
      // Keep unread notifications in the backend if browser permission is not available.
    }
  }

  async function sendDailyExpiryNotification() {
    if (!user || !notificationSettings.enabled || !hasNotificationPermission()) return;
    const targetDays = notificationSettings.days || [];
    if (!targetDays.length || !foods.length) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    const notificationKey = `${todayKey}-${targetDays.join('-')}`;
    if (lastExpiryNotificationKey === notificationKey) return;

    const targets = getExpiryTargets(foods, targetDays);
    if (!targets.length) return;

    try {
      await showAppNotification('Food Manager 소비기한 알림', buildExpiryNotificationBody(targets, targetDays));
      await recordExpiryNotifications(targetDays);
      setLastExpiryNotificationKey(notificationKey);
    } catch {
      // Permission can be revoked outside the app; keep the UI quiet during automatic checks.
    }
  }

  async function recordExpiryNotifications(days) {
    const data = await api('/api/notifications/expiry', {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
    if (Array.isArray(data)) setNotifications(data);
  }

  function selectNavItem(id) {
    if (id !== 'foods' && !user) return requireLogin(id);
    if (id === 'sales' && user.role !== 'seller' && !registeredAddress) {
      setScreen(id);
      requestAddressRegistration();
      return undefined;
    }
    setScreen(id);
    if (id === 'sales') setTimeout(() => loadSales(), 0);
    return undefined;
  }

  function mapNotificationSettings(data) {
    if (!data) return DEFAULT_NOTIFICATION_SETTINGS;
    const days = [
      data.notify1day && 1,
      data.notify3day && 3,
      data.notify7day && 7,
    ].filter(Boolean);
    return {
      enabled: data.enabled,
      days,
      discountEnabled: data.discountEnabled,
    };
  }

  if (!started && !user) {
    return <WelcomeScreen onLogin={openLoginFromWelcome} />;
  }

  return (
    <main className={c.app}>
      <AppHeader user={user} onLogin={() => requireLogin(screen)} />

      {message && <div className={c.toast}>{message}</div>}

      <section className={c.content}>
        {screen === 'foods' && (
          <FoodScreen
            user={user}
            foods={foods}
            foodForm={foodForm}
            foodAction={foodAction}
            selectedFood={selectedFood}
            selectedFoodIds={selectedFoodIds}
            showFoodList={showFoodList}
            selectedGroup={selectedGroup}
            setFoodForm={setFoodForm}
            pickFood={pickFood}
            saveFood={saveFood}
            deleteFood={deleteFood}
            deleteConfirmOpen={deleteConfirmOpen}
            setDeleteConfirmOpen={setDeleteConfirmOpen}
            selectFood={selectFood}
            startFoodAction={startFoodAction}
            requireLogin={requireLogin}
          />
        )}
        {screen === 'auth' && (
          <AuthScreen authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} login={login} signup={signup} openPostcode={() => openPostcode('auth')} />
        )}
        {screen === 'sales' && (
          <SalesScreen
            user={user}
            foods={foods}
            sales={sales}
            address={registeredAddress}
            onLogin={() => requireLogin('sales')}
            onRequireAddress={requestAddressRegistration}
            onCreateSale={createSale}
            onDeleteSales={deleteSales}
          />
        )}
        {screen === 'recipes' && <RecipeScreen user={user} foods={foods} recipes={recipes} loading={recipesLoading} onLogin={() => requireLogin('recipes')} />}
        {screen === 'settings' && (
          <SettingsScreen
            user={user}
            address={registeredAddress}
            notificationSettings={notificationSettings}
            notifications={notifications}
            onNotificationChange={updateNotificationSettings}
            onTestExpiryNotification={testExpiryNotification}
            onLogin={() => requireLogin('settings')}
            onLogout={() => setLogoutConfirmOpen(true)}
            openPostcode={() => openPostcode('settings')}
            onDeleteAddress={() => setAddressDeleteConfirmOpen(true)}
          />
        )}
      </section>

      <BottomNavigation items={navItems} activeScreen={screen} onSelect={selectNavItem} />
      <PostcodeModal open={postcodeOpen} onClose={() => setPostcodeOpen(false)} />
      <AddressNoticeModal open={addressNoticeOpen} onClose={() => setAddressNoticeOpen(false)} onContinue={continueAddressRegistration} />
      <DetailAddressModal
        open={detailAddressOpen}
        address={pendingAddress}
        detailAddress={detailAddressInput}
        onDetailAddressChange={setDetailAddressInput}
        onSave={saveDetailAddress}
      />
      <ConfirmDialog
        open={addressDeleteConfirmOpen}
        title="위치 정보를 삭제할까요?"
        body="삭제하면 주변 할인 정보 조회 전에 다시 주소를 등록해야 합니다."
        onCancel={() => setAddressDeleteConfirmOpen(false)}
        onConfirm={deleteAddress}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="정말 삭제하시겠습니까?"
        body={`선택한 ${selectedFoodIds.length}개의 항목이 삭제됩니다.`}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteFood}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="로그아웃하시겠습니까?"
        body="현재 계정에서 나가고 초기 화면으로 이동합니다."
        confirmLabel="로그아웃"
        confirmClass="bg-slate-950"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={logout}
      />
      {dataLoadingCount > 0 && <LoadingOverlay />}
    </main>
  );
}
