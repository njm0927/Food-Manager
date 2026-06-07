import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { api, clearSession, readUser, saveSession } from './src/api';
import { FOOD_ACTIONS, FOOD_GROUPS, UNIT_OPTIONS, firstFood, defaultExpiryDate, findFoodGroup, findSubcategory } from './src/food';
import { requestNotificationPermission, showAppNotification } from './src/notifications';

const tabs = {
  consumer: [
    ['foods', '식료품', '🧺'],
    ['sales', '할인', '🏷️'],
    ['recipes', '레시피', '🍳'],
    ['settings', '설정', '⚙️'],
  ],
  seller: [
    ['foods', '식료품', '🧺'],
    ['sales', '할인', '🏷️'],
    ['settings', '설정', '⚙️'],
  ],
};

const notificationDefaults = { enabled: true, days: [1, 3, 7], discountEnabled: true };
const appIcon = require('./assets/icon.png');

export default function App() {
  const [booting, setBooting] = useState(true);
  const [started, setStarted] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('foods');
  const [authMode, setAuthMode] = useState('login');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [foods, setFoods] = useState([]);
  const [sales, setSales] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [address, setAddress] = useState(null);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [pendingAddress, setPendingAddress] = useState(null);
  const [detailAddress, setDetailAddress] = useState('');
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
  const [saleForm, setSaleForm] = useState({
    foodId: '',
    saleQuantity: '1',
    originalPrice: '',
    salePrice: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  });
  const [foodAction, setFoodAction] = useState('menu');
  const [selectedFood, setSelectedFood] = useState(null);
  const [showFoodList, setShowFoodList] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(notificationDefaults);

  const visibleTabs = user?.role === 'seller' ? tabs.seller : tabs.consumer;
  const activeSaleFoodIds = useMemo(() => new Set(sales.map((sale) => Number(sale.foodId))), [sales]);
  const saleableFoods = foods.filter((food) => !activeSaleFoodIds.has(Number(food.id)));
  const notifiedIdsRef = useRef(new Set());
  const lastExpirySyncKeyRef = useRef('');

  useEffect(() => {
    (async () => {
      const savedUser = await readUser();
      setUser(savedUser);
      setStarted(Boolean(savedUser));
      setBooting(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshAll();
    loadNotificationSettings();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const timer = setInterval(() => {
      refreshAll({ silent: true });
    }, 30000);

    return () => clearInterval(timer);
  }, [user, notificationSettings]);

  useEffect(() => {
    if (user?.role === 'consumer' && screen === 'recipes') {
      recommendRecipes();
    }
  }, [screen, user?.role, foods.length]);

  async function withLoading(work) {
    setLoading(true);
    setMessage('');
    try {
      await work();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }




  async function refreshAll(options = {}, activeUser = user, activeSettings = notificationSettings) {
    const work = async () => {
      const [nextFoods, nextAddress, nextNotifications] = await Promise.all([
        api('/api/foods'),
        api('/api/me/address').catch(() => null),
        api('/api/notifications').catch(() => []),
      ]);
      const normalizedFoods = Array.isArray(nextFoods) ? nextFoods : [];
      const baseNotifications = Array.isArray(nextNotifications) ? nextNotifications : [];
      const expiryNotifications = await createExpiryNotifications(normalizedFoods, activeSettings).catch(() => []);
      const mergedNotifications = mergeNotifications([...baseNotifications, ...expiryNotifications]);

      setFoods(normalizedFoods);
      setAddress(nextAddress?.address ? nextAddress : null);
      setNotifications(mergedNotifications);
      if (options.forceExpiryPush) {
        await notifyCurrentExpiryFoods(normalizedFoods, activeSettings);
      }
      await notifyUnreadNotifications(mergedNotifications, activeUser, activeSettings);
      await loadSales(nextAddress, activeUser);
    };

    if (options.silent) {
      try {
        await work();
      } catch {
        // Background refresh should not interrupt the current screen.
      }
      return;
    }

    await withLoading(work);
  }

  async function createExpiryNotifications(currentFoods, activeSettings = notificationSettings) {
    if (!activeSettings.enabled || !activeSettings.days.length || !currentFoods.length) return [];

    const today = new Date().toISOString().slice(0, 10);
    const foodSignature = currentFoods.map((food) => `${food.id}:${food.expiryDate || ''}`).join('|');
    const key = `${today}:${activeSettings.days.join(',')}:${foodSignature}`;
    if (lastExpirySyncKeyRef.current === key) return [];

    lastExpirySyncKeyRef.current = key;
    return api('/api/notifications/expiry', {
      method: 'POST',
      body: JSON.stringify({ days: activeSettings.days }),
    });
  }

  function mergeNotifications(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = item?.id ? `id:${item.id}` : `${item?.type}:${item?.referenceId}:${item?.body}`;
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function notifyUnreadNotifications(items, activeUser = user, activeSettings = notificationSettings) {
    const unreadItems = items.filter((item) => {
      if (!item || item.read) return false;
      if (item.type === 'expiry' && !activeSettings.enabled) return false;
      if (item.type === 'discount' && (!activeSettings.discountEnabled || activeUser?.role !== 'consumer')) return false;
      const key = item.id ? `id:${item.id}` : `${item.type}:${item.referenceId}:${item.body}`;
      return !notifiedIdsRef.current.has(key);
    });

    if (!unreadItems.length) return;

    let delivered = false;
    for (const item of unreadItems.slice(0, 3)) {
      const key = item.id ? `id:${item.id}` : `${item.type}:${item.referenceId}:${item.body}`;
      const shown = await showAppNotification(item.title || 'Food Manager 알림', item.body || item.message);
      if (shown) {
        notifiedIdsRef.current.add(key);
        delivered = true;
      }
    }

    if (delivered) {
      await api('/api/notifications/read', { method: 'PUT' }).catch(() => null);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    }
  }

  async function notifyCurrentExpiryFoods(currentFoods, activeSettings = notificationSettings) {
    if (!activeSettings.enabled || !activeSettings.days.length || !currentFoods.length) return;

    const today = todayIso();
    const sortedDays = [...activeSettings.days].sort((a, b) => a - b);
    const targets = currentFoods
      .map((food) => {
        if (!food?.expiryDate) return null;
        const daysUntilExpiry = calculateDaysUntilDate(food.expiryDate, today);
        if (daysUntilExpiry < 0) {
          return {
            food,
            key: `login-expired:${food.id}:${food.expiryDate}:${today}`,
            title: '소비기한이 지났습니다',
            body: `${getFoodName(food)}의 소비기한이 지났습니다. 확인해 주세요.`,
          };
        }
        const threshold = sortedDays.find((day) => daysUntilExpiry <= day);
        if (!threshold) return null;
        return {
          food,
          key: `login-expiry:${food.id}:${food.expiryDate}:${threshold}:${today}`,
          title: '소비기한 알림',
          body: `${getFoodName(food)}의 소비기한이 ${formatExpiryRemainingMessage(daysUntilExpiry)}`,
        };
      })
      .filter(Boolean);

    for (const target of targets.slice(0, 5)) {
      if (notifiedIdsRef.current.has(target.key)) continue;
      const shown = await showAppNotification(target.title, target.body);
      if (shown) notifiedIdsRef.current.add(target.key);
    }
  }

  async function loadNotificationSettings() {
    try {
      const saved = await api('/api/me/notification-settings');
      const normalized = fromNotificationResponse(saved);
      setNotificationSettings(normalized);
      return normalized;
    } catch {
      setNotificationSettings(notificationDefaults);
      return notificationDefaults;
    }
  }

  async function saveNotificationSettings(nextSettings = notificationSettings) {
    await withLoading(async () => {
      const saved = await api('/api/me/notification-settings', {
        method: 'PUT',
        body: JSON.stringify(toNotificationRequest(nextSettings)),
      });
      const normalized = fromNotificationResponse(saved);
      setNotificationSettings(normalized);
      if (normalized.enabled || normalized.discountEnabled) {
        await requestNotificationPermission();
      }
      notifiedIdsRef.current.clear();
      lastExpirySyncKeyRef.current = '';
      setMessage('알림 설정을 저장했습니다.');
      await refreshAll({ silent: true }, user, normalized);
    });
  }

  async function loadSales(addressOverride = address, activeUser = user) {
    const region = activeUser?.role === 'seller' ? '' : getAddressRegion(addressOverride);
    const path = region ? `/api/sales?region=${encodeURIComponent(region)}` : '/api/sales';
    const data = await api(path);
    setSales(Array.isArray(data) ? data : []);
  }

  async function login() {
    await withLoading(async () => {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userId: authForm.userId, password: authForm.password }),
      });
      await saveSession(data);
      setUser(data.user);
      setStarted(true);
      setScreen('foods');
      setFoodAction('menu');
      setShowFoodList(false);
      notifiedIdsRef.current.clear();
      lastExpirySyncKeyRef.current = '';
      const settings = await loadNotificationSettings();
      await refreshAll({ silent: true, forceExpiryPush: true }, data.user, settings);
    });
  }

  async function signup(role) {
    await withLoading(async () => {
      await api(`/api/auth/signup/${role}`, {
        method: 'POST',
        body: JSON.stringify({
          ...authForm,
          businessNumber: String(authForm.businessNumber || '').replace(/\D/g, ''),
        }),
      });
      setStarted(true);
      setScreen('auth');
      setAuthMode('login');
      setFoodAction('menu');
      setShowFoodList(false);
      setMessage('회원가입이 완료되었습니다. 로그인해 주세요.');
    });
  }

  async function logout() {
    await clearSession();
    setUser(null);
    setStarted(false);
    setScreen('foods');
    setAuthMode('login');
    setFoodAction('menu');
    setShowFoodList(false);
    setSelectedFood(null);
    setFoods([]);
    setSales([]);
    setRecipes([]);
    setNotifications([]);
    notifiedIdsRef.current.clear();
    lastExpirySyncKeyRef.current = '';
    setAddress(null);
  }

  function foodPayload() {
    return {
      ...foodForm,
      name: foodForm.itemName,
      price: 0,
      quantity: Number(foodForm.quantity),
      expiryDate: foodForm.noExpiry ? null : foodForm.expiryDate,
    };
  }

  async function saveFood() {
    await withLoading(async () => {
      await api('/api/foods', {
        method: 'POST',
        body: JSON.stringify(foodPayload()),
      });
      setMessage(`${foodForm.itemName}을 추가했습니다.`);
      setFoodForm({ ...firstFood, quantity: '1', unit: '개', expiryDate: defaultExpiryDate(firstFood.category), noExpiry: false });
      setShowFoodList(true);
      setFoods(await api('/api/foods'));
    });
  }

  async function updateFood(id) {
    if (!id) {
      setMessage('수정할 식료품을 선택해 주세요.');
      return;
    }
    await withLoading(async () => {
      await api(`/api/foods/${id}`, {
        method: 'PUT',
        body: JSON.stringify(foodPayload()),
      });
      setMessage(`${foodForm.itemName}을 수정했습니다.`);
      setSelectedFood(null);
      setFoods(await api('/api/foods'));
    });
  }

  async function deleteFood(id) {
    await withLoading(async () => {
      await api(`/api/foods/${id}`, { method: 'DELETE' });
      setFoods(await api('/api/foods'));
    });
  }

  async function deleteFoods(ids) {
    await withLoading(async () => {
      await Promise.all(ids.map((id) => api(`/api/foods/${id}`, { method: 'DELETE' })));
      setMessage(`${ids.length}개의 식료품을 삭제했습니다.`);
      setFoods(await api('/api/foods'));
    });
  }

  async function createSale(payload = saleForm) {
    await withLoading(async () => {
      await api('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          foodId: Number(payload.foodId),
          quantity: payload.saleQuantity === '' ? 0 : Number(payload.saleQuantity),
          originalPrice: Number(payload.originalPrice),
          salePrice: Number(payload.salePrice),
          startDate: payload.startDate,
          endDate: payload.endDate,
        }),
      });
      setMessage('할인 정보를 등록했습니다.');
      await loadSales();
    });
  }


  async function deleteSales(ids) {
    await withLoading(async () => {
      await Promise.all(ids.map((id) => api(`/api/sales/${id}`, { method: 'DELETE' })));
      setMessage(`${ids.length}개의 할인 정보를 삭제했습니다.`);
      await loadSales();
    });
  }

  async function recommendRecipes() {
    if (!foods.length) {
      setRecipes([]);
      return;
    }
    setRecipeLoading(true);
    try {
      const names = Array.from(new Set(foods.map((food) => food.itemName || food.name).filter(Boolean))).slice(0, 4);
      const results = await Promise.allSettled(names.map((name) => api(`/api/recipes?query=${encodeURIComponent(name)}`)));
      const rows = results.flatMap((result) => {
        if (result.status !== 'fulfilled') return [];
        return result.value?.items || result.value?.recipes || result.value?.COOKRCP01?.row || [];
      });
      setRecipes(rows.slice(0, 20));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setRecipeLoading(false);
    }
  }

  async function saveAddress(nextAddress) {
    await withLoading(async () => {
      const normalizedAddress = normalizeAddressPayload(nextAddress);
      const saved = await api('/api/me/address', {
        method: 'PUT',
        body: JSON.stringify(normalizedAddress),
      });
      setAddress(saved);
      if (user?.role !== 'seller') await loadSales(saved);
      setMessage('위치를 등록했습니다.');
    });
  }

  async function deleteAddress() {
    if (user?.role === 'seller') {
      Alert.alert('삭제 불가', '판매자 계정은 위치 변경만 가능합니다.');
      return;
    }
    await withLoading(async () => {
      await api('/api/me/address', { method: 'DELETE' });
      setAddress(null);
      setSales([]);
      setMessage('위치 정보를 삭제했습니다.');
    });
  }
  function chooseFood(category, subcategory, itemName, emoji) {
    setFoodForm((current) => ({ ...current, category, subcategory, itemName, emoji, expiryDate: current.noExpiry ? '' : defaultExpiryDate(category) }));
  }

  function requireLogin() {
    setStarted(true);
    setScreen('auth');
    setAuthMode('login');
    setMessage('로그인이 필요한 기능입니다.');
  }

  function openTab(id) {
    if (!user) {
      requireLogin();
      return;
    }

    if (id === 'foods') {
      setFoodAction('menu');
      setShowFoodList(false);
      setSelectedFood(null);
    }
    setScreen(id);
  }

  if (booting) {
    return <Centered text="앱을 준비하는 중" />;
  }

  if (!started && !user) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Image source={appIcon} style={styles.heroIcon} resizeMode="contain" />
          <Text style={styles.heroTitle}>Food Manager</Text>
          <Text style={styles.heroText}>식료품, 할인, 레시피를 한 곳에서 관리하세요.</Text>
        </View>
        <Button label="로그인" onPress={() => { setStarted(true); setScreen('auth'); setAuthMode('login'); }} />
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={appIcon} style={styles.brandIcon} resizeMode="contain" />
          <Text style={styles.brand}>Food Manager</Text>
        </View>
        {!user && <Button label="로그인" small onPress={() => setScreen('auth')} />}
      </View>
      {message ? <Text style={styles.toast}>{message}</Text> : null}
      {loading ? <ActivityIndicator style={styles.loader} color="#0284c7" /> : null}
      <Watermark />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {screen === 'auth' && (
          <AuthView
            authMode={authMode}
            setAuthMode={setAuthMode}
            form={authForm}
            setForm={setAuthForm}
            login={login}
            signup={signup}
            openAddress={() => setAddressPickerOpen(true)}
          />
        )}
        {screen === 'foods' && user && (
          <FoodsView
            foods={foods}
            foodForm={foodForm}
            setFoodForm={setFoodForm}
            chooseFood={chooseFood}
            saveFood={saveFood}
            updateFood={updateFood}
            deleteFoods={deleteFoods}
            foodAction={foodAction}
            setFoodAction={setFoodAction}
            selectedFood={selectedFood}
            setSelectedFood={setSelectedFood}
            showFoodList={showFoodList}
            setShowFoodList={setShowFoodList}
          />
        )}
        {screen === 'sales' && user && (
          <SalesView
            user={user}
            address={address}
            sales={sales}
            saleForm={saleForm}
            setSaleForm={setSaleForm}
            saleableFoods={saleableFoods}
            createSale={createSale}
            deleteSales={deleteSales}
            openAddress={() => setAddressPickerOpen(true)}
          />
        )}
        {screen === 'recipes' && user && (
          <RecipesView recipes={recipes} foods={foods} loading={recipeLoading} />
        )}
        {screen === 'settings' && user && (
          <SettingsView
            user={user}
            address={address}
            notifications={notifications}
            notificationSettings={notificationSettings}
            setNotificationSettings={setNotificationSettings}
            saveNotificationSettings={saveNotificationSettings}
            openAddress={() => setAddressPickerOpen(true)}
            deleteAddress={deleteAddress}
            logout={logout}
          />
        )}
      </ScrollView>
      <View style={styles.nav}>
        {visibleTabs.map(([id, label, icon]) => (
          <Pressable key={id} style={[styles.navItem, screen === id && styles.navActive]} onPress={() => openTab(id)}>
            <Text style={styles.navIcon}>{icon}</Text>
            <Text style={styles.navText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <AddressPicker
        visible={addressPickerOpen}
        onClose={() => setAddressPickerOpen(false)}
        onPicked={(picked) => {
          setAddressPickerOpen(false);
          if (!user && authMode === 'seller') {
            setAuthForm((current) => ({ ...current, ...normalizeAddressPayload(picked) }));
            return;
          }
          setPendingAddress(picked);
          setDetailAddress('');
        }}
      />
      <DetailAddressModal
        address={pendingAddress}
        detailAddress={detailAddress}
        setDetailAddress={setDetailAddress}
        onClose={() => setPendingAddress(null)}
        onSave={() => {
          const nextAddress = normalizeAddressPayload({ ...pendingAddress, detailAddress });
          setPendingAddress(null);
          saveAddress(nextAddress);
        }}
      />
    </SafeAreaView>
  );
}

function AuthView({ authMode, setAuthMode, form, setForm, login, signup, openAddress }) {
  const isSeller = authMode === 'seller';
  const isSignup = authMode === 'consumer' || authMode === 'seller';

  if (authMode === 'registerChoice') {
    return (
      <View style={styles.stack}>
        <Title title="회원가입" kicker="계정 선택" />
        <Card>
          <Text style={styles.cardTitle}>가입 유형을 선택하세요</Text>
          <Text style={styles.muted}>소비자는 주소를 나중에 등록할 수 있고, 판매자는 사업장 정보를 함께 입력합니다.</Text>
          <Button label="소비자로 가입" onPress={() => setAuthMode('consumer')} />
          <Button label="판매자로 가입" variant="secondary" onPress={() => setAuthMode('seller')} />
        </Card>
        <Button label="로그인으로 돌아가기" variant="secondary" onPress={() => setAuthMode('login')} />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <Title title={authMode === 'login' ? '로그인' : isSeller ? '판매자 회원가입' : '소비자 회원가입'} />
      <Input label="아이디" value={form.userId} onChangeText={(userId) => setForm({ ...form, userId })} />
      <Input label="비밀번호" secureTextEntry value={form.password} onChangeText={(password) => setForm({ ...form, password })} />
      {isSignup && <Input label="이름" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />}
      {isSeller && (
        <>
          <Input label="상호명" value={form.businessName} onChangeText={(businessName) => setForm({ ...form, businessName })} />
          <Input label="사업자 이름" value={form.businessOwnerName} onChangeText={(businessOwnerName) => setForm({ ...form, businessOwnerName })} />
          <Input label="사업자번호" keyboardType="number-pad" value={form.businessNumber} onChangeText={(businessNumber) => setForm({ ...form, businessNumber: formatBusinessNumber(businessNumber) })} />
          <Text style={styles.muted}>숫자 10자리 기준으로 확인합니다.</Text>
          <Button label={form.address ? `주소 선택됨: ${form.address}` : '사업장 주소 검색'} onPress={openAddress} variant="secondary" />
          <Input label="상세주소" value={form.detailAddress} onChangeText={(detailAddress) => setForm({ ...form, detailAddress })} />
        </>
      )}
      {authMode === 'login' ? (
        <>
          <Button label="로그인" onPress={login} />
          <Button label="회원가입" variant="secondary" onPress={() => setAuthMode('registerChoice')} />
        </>
      ) : (
        <>
          <Button label="가입하기" onPress={() => signup(authMode)} />
          <Button label="로그인으로 돌아가기" variant="secondary" onPress={() => setAuthMode('login')} />
        </>
      )}
    </View>
  );
}

function FoodsView({
  foods,
  foodForm,
  setFoodForm,
  chooseFood,
  saveFood,
  updateFood,
  deleteFoods,
  foodAction,
  setFoodAction,
  selectedFood,
  setSelectedFood,
  showFoodList,
  setShowFoodList,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState('category');
  const [pickerCategory, setPickerCategory] = useState(foodForm.category || FOOD_GROUPS[0].label);
  const [pickerSubcategory, setPickerSubcategory] = useState(foodForm.subcategory || FOOD_GROUPS[0].subcategories[0].label);
  const [selectedFoodIds, setSelectedFoodIds] = useState([]);
  const [searchForm, setSearchForm] = useState({ keyword: '', category: '전체', expiry: 'all' });
  const sortedFoods = sortFoods(foods);
  const visibleFoods = foodAction === 'search' ? filterFoods(sortedFoods, searchForm) : sortedFoods;
  const resetFoodForm = () => setFoodForm({
    ...firstFood,
    quantity: '1',
    unit: '개',
    expiryDate: defaultExpiryDate(firstFood.category),
    noExpiry: false,
  });

  function startAction(action) {
    setFoodAction(action);
    if (['edit', 'delete', 'search', 'view'].includes(action)) setShowFoodList(true);
    if (action === 'add') {
      setShowFoodList(false);
      setSelectedFood(null);
      setSelectedFoodIds([]);
      resetFoodForm();
    }
  }

  function selectFood(food) {
    if (foodAction === 'delete') {
      setSelectedFoodIds((current) => current.includes(food.id) ? current.filter((id) => id !== food.id) : [...current, food.id]);
      return;
    }
    if (foodAction === 'edit') {
      setSelectedFood(food);
      setFoodForm({
        category: food.category || firstFood.category,
        subcategory: food.subcategory || food.category || firstFood.subcategory,
        itemName: getFoodName(food),
        emoji: food.emoji || '🍽️',
        quantity: String(food.quantity || 1),
        unit: food.unit || '개',
        expiryDate: food.expiryDate || defaultExpiryDate(food.category),
        noExpiry: !food.expiryDate,
      });
    }
  }

  return (
    <View style={styles.stack}>
      <Title title="오늘 관리할 식료품" kicker="식료품" />
      <View style={styles.actionGrid}>
        {FOOD_ACTIONS.map(([action, label, emoji]) => (
          <Pressable key={action} style={[styles.actionButton, foodAction === action && styles.actionButtonActive]} onPress={() => startAction(action)}>
            <Text style={styles.actionEmoji}>{emoji}</Text>
            <Text style={[styles.actionText, foodAction === action && styles.actionTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {(foodAction === 'add' || foodAction === 'edit') && (
        <Card>
          <View style={styles.foodHeaderRow}>
            <Text style={styles.foodBigIcon}>{foodForm.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{foodAction === 'edit' ? '식료품 수정' : '식료품 추가'}</Text>
              <Text style={styles.cardTitle}>{foodForm.itemName}</Text>
              {foodAction === 'edit' && !selectedFood ? <Text style={styles.muted}>아래 목록에서 수정할 식료품을 먼저 선택하세요.</Text> : null}
            </View>
          </View>
          <Button label={`${foodForm.emoji} 카테고리/식료품 선택`} variant="secondary" onPress={() => {
            setPickerCategory(foodForm.category || FOOD_GROUPS[0].label);
            setPickerSubcategory(foodForm.subcategory || findFoodGroup(foodForm.category).subcategories[0].label);
            setPickerStep('category');
            setPickerOpen(true);
          }} />
          <View style={styles.twoColumns}>
            <Input label="수량" keyboardType="number-pad" value={foodForm.quantity} onChangeText={(quantity) => setFoodForm({ ...foodForm, quantity })} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>단위</Text>
              <View style={styles.chips}>{UNIT_OPTIONS.map((unit) => <Chip key={unit} label={unit} active={foodForm.unit === unit} onPress={() => setFoodForm({ ...foodForm, unit })} />)}</View>
            </View>
          </View>
          <DateField
            label="소비기한"
            value={foodForm.noExpiry ? '' : foodForm.expiryDate}
            disabled={foodForm.noExpiry}
            onChange={(expiryDate) => setFoodForm({ ...foodForm, expiryDate, noExpiry: false })}
          />
          <Chip label="소비기한을 모르겠어요" active={foodForm.noExpiry} onPress={() => setFoodForm({ ...foodForm, noExpiry: !foodForm.noExpiry, expiryDate: foodForm.noExpiry ? defaultExpiryDate(foodForm.category) : '' })} />
          <Button label={foodAction === 'edit' ? '수정하기' : '추가하기'} onPress={() => foodAction === 'edit' ? updateFood(selectedFood?.id) : saveFood()} />
        </Card>
      )}

      {foodAction === 'delete' && (
        <Card>
          <View style={styles.betweenRow}>
            <View><Text style={styles.cardTitle}>삭제할 항목 선택</Text><Text style={styles.muted}>선택 {selectedFoodIds.length}개</Text></View>
            <Button label="🗑️" variant="danger" small onPress={() => selectedFoodIds.length && Alert.alert('삭제 확인', `선택한 ${selectedFoodIds.length}개 식료품을 삭제할까요?`, [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: async () => { await deleteFoods(selectedFoodIds); setSelectedFoodIds([]); } },
            ])} />
          </View>
        </Card>
      )}

      {foodAction === 'search' && (
        <Card>
          <Text style={styles.cardTitle}>식료품 검색</Text>
          <Input label="검색어" value={searchForm.keyword} onChangeText={(keyword) => setSearchForm({ ...searchForm, keyword })} />
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.chips}>{['전체', ...FOOD_GROUPS.map((group) => group.label)].map((category) => <Chip key={category} label={category} active={searchForm.category === category} onPress={() => setSearchForm({ ...searchForm, category })} />)}</View>
          <Text style={styles.label}>소비기한 상태</Text>
          <View style={styles.chips}>{[['all', '전체'], ['expired', '기한 지남'], ['soon', '임박'], ['fresh', '여유'], ['none', '기한 없음']].map(([expiry, label]) => <Chip key={expiry} label={label} active={searchForm.expiry === expiry} onPress={() => setSearchForm({ ...searchForm, expiry })} />)}</View>
        </Card>
      )}

      {showFoodList ? (
        <View style={styles.stack}>
          {visibleFoods.map((food) => {
            const status = getExpiryStatus(food.expiryDate);
            const selected = selectedFoodIds.includes(food.id) || selectedFood?.id === food.id;
            return (
              <Pressable key={food.id} style={[styles.foodRow, styles[status.cardStyle], selected && styles.selectedRow]} onPress={() => selectFood(food)}>
                {foodAction === 'delete' ? <Text style={[styles.checkBox, selectedFoodIds.includes(food.id) && styles.checkBoxOn]}>✓</Text> : <Text style={styles.foodIcon}>{food.emoji || '🍽️'}</Text>}
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{getFoodName(food)}</Text>
                  <Text style={styles.muted}>{food.category || '식료품'} · {food.subcategory ? `${food.subcategory} · ` : ''}{food.quantity || 1}{food.unit || '개'}</Text>
                </View>
                <Text style={[styles.expiryLabel, styles[status.textStyle]]}>{status.label}{'\n'}{status.dateLabel}</Text>
              </Pressable>
            );
          })}
          {!visibleFoods.length && <Card><Text style={styles.muted}>{foodAction === 'search' ? '검색 조건에 맞는 식료품이 없습니다.' : '등록된 식료품이 없습니다.'}</Text></Card>}
        </View>
      ) : (
        <Card><Text style={styles.cardTitle}>조회 버튼을 눌러 식료품을 확인하세요</Text><Text style={styles.muted}>등록된 식료품 목록은 조회, 검색, 수정, 삭제 모드에서 표시됩니다.</Text></Card>
      )}

      <FoodPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} step={pickerStep} setStep={setPickerStep} category={pickerCategory} setCategory={setPickerCategory} subcategory={pickerSubcategory} setSubcategory={setPickerSubcategory} onPick={(category, subcategory, name, emoji) => { chooseFood(category, subcategory, name, emoji); setPickerOpen(false); }} />
    </View>
  );
}

function FoodPickerModal({ visible, onClose, step, setStep, category, setCategory, subcategory, setSubcategory, onPick }) {
  const group = findFoodGroup(category);
  const sub = findSubcategory(group, subcategory);
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.safe}>
        <View style={styles.modalHeader}><Text style={styles.brand}>식료품 선택</Text><Button label="닫기" small variant="secondary" onPress={onClose} /></View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.progressRow}>
            <Chip label={`큰 카테고리 ${category}`} active={step === 'category'} onPress={() => setStep('category')} />
            <Chip label={`중간 ${subcategory}`} active={step === 'subcategory'} onPress={() => setStep('subcategory')} />
            <Chip label="식료품" active={step === 'item'} />
          </View>
          {step === 'category' && <View style={styles.grid2}>{FOOD_GROUPS.map((item) => <Pressable key={item.label} style={styles.pickCard} onPress={() => { setCategory(item.label); setSubcategory(item.subcategories[0].label); setStep('subcategory'); }}><Text style={styles.pickEmoji}>{item.subcategories[0]?.items[0]?.[1] || '🍽️'}</Text><Text style={styles.pickText}>{item.label}</Text></Pressable>)}</View>}
          {step === 'subcategory' && <View style={styles.grid2}>{group.subcategories.map((item) => <Pressable key={item.label} style={styles.pickCard} onPress={() => { setSubcategory(item.label); setStep('item'); }}><Text style={styles.pickEmoji}>{item.items[0]?.[1] || '🍽️'}</Text><Text style={styles.pickText}>{item.label}</Text></Pressable>)}</View>}
          {step === 'item' && <View style={styles.grid2}>{sub.items.map(([name, emoji]) => <Pressable key={name} style={styles.pickCard} onPress={() => onPick(group.label, sub.label, name, emoji)}><Text style={styles.pickEmoji}>{emoji}</Text><Text style={styles.pickText}>{name}</Text></Pressable>)}</View>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function SalesView({ user, address, sales, saleForm, setSaleForm, saleableFoods, createSale, deleteSales, openAddress }) {
  const [mode, setMode] = useState('list');
  const [selectedSaleIds, setSelectedSaleIds] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);

  if (user?.role !== 'seller' && !address) {
    return (
      <View style={styles.stack}>
        <Title title="주소 등록이 필요합니다" kicker="할인" />
        <Card>
          <Text style={styles.cardTitle}>주변 할인 정보를 보려면 주소가 필요합니다.</Text>
          <Text style={styles.muted}>현재 위치와 같은 광역시 또는 시에 있는 판매자의 할인만 표시합니다.</Text>
          <Button label="주소 등록" onPress={openAddress} />
        </Card>
      </View>
    );
  }

  async function submitDeleteSales() {
    if (!selectedSaleIds.length) return;
    Alert.alert('삭제 확인', `선택한 ${selectedSaleIds.length}개의 할인 정보를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteSales(selectedSaleIds);
          setSelectedSaleIds([]);
          setMode('list');
        },
      },
    ]);
  }

  function toggleSale(id) {
    setSelectedSaleIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <View style={styles.stack}>
      <Title title={user?.role === 'seller' ? '할인 정보 관리' : '주변 할인 정보'} kicker="할인" />
      {user?.role === 'seller' && (
        <Card>
          <Text style={styles.cardTitle}>할인 작업 선택</Text>
          <View style={styles.twoColumns}>
            <Button label="할인 정보 등록" onPress={() => { setMode('add'); setSaleModalOpen(true); }} />
            <Button label={mode === 'delete' ? '삭제 취소' : '할인 정보 삭제'} variant={mode === 'delete' ? 'secondary' : 'danger'} onPress={() => { setMode(mode === 'delete' ? 'list' : 'delete'); setSelectedSaleIds([]); }} />
          </View>
          {mode === 'delete' && <Button label={`선택한 할인 삭제 (${selectedSaleIds.length})`} variant="danger" onPress={submitDeleteSales} />}
        </Card>
      )}

      {sales.map((sale) => {
        const selected = selectedSaleIds.includes(sale.id);
        return (
          <Pressable key={sale.id} style={[styles.foodRow, selected && styles.selectedRow]} onPress={() => mode === 'delete' ? toggleSale(sale.id) : setSelectedSale(sale)}>
            {mode === 'delete' && <Text style={[styles.checkBox, selected && styles.checkBoxOn]}>✓</Text>}
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{sale.foodName}</Text>
              <Text style={styles.muted}>정가 {Number(sale.originalPrice || 0).toLocaleString()}원 · {sale.startDate} ~ {sale.endDate}</Text>
              {sale.marketName ? <Text style={styles.muted}>{sale.marketName} · {sale.marketAddress}</Text> : null}
            </View>
            <View style={styles.saleBadge}>
              <Text style={styles.salePrice}>{Number(sale.salePrice || 0).toLocaleString()}원</Text>
              <Text style={styles.saleRate}>{sale.discountRate || 0}% 할인</Text>
            </View>
          </Pressable>
        );
      })}
      {!sales.length && <Card><Text style={styles.muted}>{user?.role === 'seller' ? '등록된 할인 정보가 없습니다.' : '주변 할인 정보가 없습니다.'}</Text></Card>}

      <SaleFormModal
        visible={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        form={saleForm}
        setForm={setSaleForm}
        foods={saleableFoods}
        onSubmit={async () => {
          const error = validateSaleDraft(saleForm, saleableFoods);
          if (error) {
            Alert.alert('할인 등록 오류', error);
            return;
          }
          await createSale(saleForm);
          setSaleModalOpen(false);
          setMode('list');
        }}
      />
      <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
    </View>
  );
}

function SaleFormModal({ visible, onClose, form, setForm, foods, onSubmit }) {
  const selectedFood = foods.find((food) => String(food.id) === String(form.foodId));

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.safe}>
        <View style={styles.modalHeader}>
          <Text style={styles.brand}>할인 정보 등록</Text>
          <Button label="닫기" small variant="secondary" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={styles.cardTitle}>할인할 식료품 선택</Text>
            <View style={styles.stack}>
              {foods.map((food) => (
                <Pressable key={food.id} style={[styles.selectRow, String(form.foodId) === String(food.id) && styles.selectedRow]} onPress={() => setForm({ ...form, foodId: String(food.id), saleQuantity: String(Math.max(0, Number(form.saleQuantity || 0))) })}>
                  <Text style={styles.foodIcon}>{food.emoji || '🍽️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodName}>{getFoodName(food)}</Text>
                    <Text style={styles.muted}>{food.quantity || 1}{food.unit || '개'} 보유</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {!foods.length && <Text style={styles.muted}>할인 등록 가능한 식료품이 없습니다.</Text>}
          </Card>
          <Card>
            <Input label="할인 등록 수량" keyboardType="number-pad" value={form.saleQuantity} onChangeText={(saleQuantity) => setForm({ ...form, saleQuantity })} placeholder="예: 1" />
            {selectedFood ? <Text style={styles.stockHint}>등록 가능 수량: {selectedFood.quantity || 1}{selectedFood.unit || '개'}</Text> : <Text style={styles.muted}>식료품을 먼저 선택해 주세요.</Text>}
            <Input label="정가" keyboardType="number-pad" value={form.originalPrice} onChangeText={(originalPrice) => setForm({ ...form, originalPrice })} />
            <Input label="할인가" keyboardType="number-pad" value={form.salePrice} onChangeText={(salePrice) => setForm({ ...form, salePrice })} />
            <View style={styles.twoColumns}>
              <DateField label="시작일" value={form.startDate} onChange={(startDate) => setForm({ ...form, startDate, endDate: form.endDate < startDate ? startDate : form.endDate })} />
              <DateField label="종료일" value={form.endDate} onChange={(endDate) => setForm({ ...form, endDate })} />
            </View>
            <Button label="할인 등록" onPress={onSubmit} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function SaleDetailModal({ sale, onClose }) {
  return (
    <Modal visible={Boolean(sale)} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.cardTitle}>{sale?.foodName}</Text>
          <Text style={styles.price}>{Number(sale?.salePrice || 0).toLocaleString()}원</Text>
          <Text style={styles.muted}>정가 {Number(sale?.originalPrice || 0).toLocaleString()}원 · {sale?.discountRate || 0}% 할인</Text>
          <Text style={styles.muted}>할인 기간 {sale?.startDate} ~ {sale?.endDate}</Text>
          {sale?.marketName ? <Text style={styles.muted}>{sale.marketName}</Text> : null}
          {sale?.marketAddress ? <Text style={styles.muted}>{sale.marketAddress}</Text> : null}
          <Button label="닫기" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function RecipesView({ recipes, foods, loading }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const ownedNames = foods.map((food) => getFoodName(food)).filter(Boolean);
  const sortedRecipes = [...recipes].sort((a, b) => compareRecipeAvailability(a, b, ownedNames));

  return (
    <View style={styles.stack}>
      <Title title="추천 레시피" kicker="레시피" />
      <Card>
        <Text style={styles.cardTitle}>등록된 식료품으로 자동 추천</Text>
        <Text style={styles.muted}>{ownedNames.join(', ') || '등록된 식료품이 없습니다.'}</Text>
      </Card>
      {loading && <Card><ActivityIndicator color="#0284c7" /><Text style={styles.muted}>레시피를 불러오는 중입니다.</Text></Card>}
      {!loading && !recipes.length && <Card><Text style={styles.muted}>추천할 레시피가 없습니다.</Text></Card>}
      {sortedRecipes.map((recipe, index) => {
        const meta = getRecipeMeta(recipe);
        const missing = findMissingIngredientsForRecipe(recipe, ownedNames);
        const imageUri = getRecipeImage(recipe);
        return (
          <Pressable key={recipe.RCP_SEQ || `${recipe.RCP_NM}-${index}`} style={styles.recipeCard} onPress={() => setSelectedRecipe(recipe)}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.recipeThumb} resizeMode="cover" /> : <View style={styles.recipeThumbFallback}><Text style={styles.recipeThumbEmoji}>🍳</Text></View>}
            <View style={styles.recipeCardBody}>
              <Text style={styles.cardTitle}>{recipe.RCP_NM || recipe.name || '레시피'}</Text>
              <Text style={styles.muted}>{recipe.RCP_PAT2 || recipe.category || '분류 없음'}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.metaPill, styles.difficultyPill]}>난이도 {meta.difficulty}</Text>
                <Text style={[styles.metaPill, styles.timePill]}>{meta.cookingTime}</Text>
              </View>
              {missing.length ? <Text style={styles.missingText}>추가 구매 필요: {formatMissingIngredients(missing)}</Text> : <Text style={styles.readyText}>현재 식료품으로 만들 수 있어요.</Text>}
            </View>
          </Pressable>
        );
      })}
      <RecipeDetailModal recipe={selectedRecipe} ownedNames={ownedNames} onClose={() => setSelectedRecipe(null)} />
    </View>
  );
}

function RecipeDetailModal({ recipe, ownedNames, onClose }) {
  const manuals = getRecipeManuals(recipe);
  const meta = getRecipeMeta(recipe || {});
  const missing = findMissingIngredientsForRecipe(recipe || {}, ownedNames || []);
  const imageUri = getRecipeImage(recipe);

  return (
    <Modal visible={Boolean(recipe)} animationType="slide">
      <SafeAreaView style={styles.safe}>
        <View style={styles.modalHeader}>
          <Text style={styles.brand}>레시피 상세</Text>
          <Button label="닫기" small variant="secondary" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.recipeImage} resizeMode="cover" /> : <View style={styles.recipeImageFallback}><Text style={styles.recipeImageFallbackText}>🍳</Text></View>}
          <Card>
            <Text style={styles.cardTitle}>{recipe?.RCP_NM || recipe?.name || '레시피'}</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}><Text style={styles.infoLabel}>분류</Text><Text style={styles.infoValue}>{recipe?.RCP_PAT2 || recipe?.category || '-'}</Text></View>
              <View style={[styles.infoBox, styles.difficultyBox]}><Text style={styles.infoLabel}>난이도</Text><Text style={[styles.infoValue, styles.difficultyText]}>{meta.difficulty}</Text></View>
              <View style={[styles.infoBox, styles.timeBox]}><Text style={styles.infoLabel}>소요시간</Text><Text style={[styles.infoValue, styles.timeText]}>{meta.cookingTime}</Text></View>
              <View style={styles.infoBox}><Text style={styles.infoLabel}>열량</Text><Text style={styles.infoValue}>{recipe?.INFO_ENG ? `${recipe.INFO_ENG}kcal` : '-'}</Text></View>
            </View>
            {missing.length ? <Text style={styles.missingDetailText}>추가 구매가 필요한 재료: {formatMissingIngredients(missing)}</Text> : <Text style={styles.readyText}>추가 구매 없이 만들 수 있습니다.</Text>}
          </Card>
          <Card>
            <Text style={styles.sectionTitle}>재료</Text>
            <Text style={styles.muted}>{recipe?.RCP_PARTS_DTLS || recipe?.ingredients || '재료 정보가 없습니다.'}</Text>
          </Card>
          <Card>
            <Text style={styles.sectionTitle}>조리 방법</Text>
            {manuals.length ? manuals.map((manual, index) => <Text key={`${manual}-${index}`} style={styles.recipeStep}>{index + 1}. {manual}</Text>) : <Text style={styles.muted}>조리 순서 정보가 없습니다.</Text>}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function SettingsView({
  user,
  address,
  notifications,
  notificationSettings,
  setNotificationSettings,
  saveNotificationSettings,
  openAddress,
  deleteAddress,
  logout,
}) {
  const expiryEnabled = notificationSettings.enabled;
  const updateSettings = (patch) => setNotificationSettings({ ...notificationSettings, ...patch });
  const confirmEnablePush = (patch) => {
    Alert.alert('푸시알림 설정', '푸시알림 설정을 등록하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '등록',
        onPress: async () => {
          const granted = await requestNotificationPermission();
          if (!granted) {
            Alert.alert('알림 권한 필요', '앱 알림을 받으려면 기기 설정에서 Food Manager 알림 권한을 허용해 주세요.', [
              { text: '나중에', style: 'cancel' },
              { text: '설정 열기', onPress: () => Linking.openSettings() },
            ]);
            return;
          }
          updateSettings(patch);
        },
      },
    ]);
  };

  return (
    <View style={styles.stack}>
      <Title title="내 설정" kicker="설정" />
      <Card>
        <Text style={styles.cardTitle}>{user?.role === 'seller' ? '🏪' : '🧑‍🍳'} {user?.name || user?.userId}</Text>
        <Text style={styles.muted}>{user?.role === 'seller' ? '판매자 계정' : '소비자 계정'}</Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>알림 설정</Text>
        <ToggleRow
          label="소비기한 알림"
          description="선택한 기간 이내의 식료품을 앱 알림으로 알려줍니다."
          active={notificationSettings.enabled}
          onPress={() => {
            if (notificationSettings.enabled) {
              updateSettings({ enabled: false });
              return;
            }
            confirmEnablePush({
              enabled: true,
              days: notificationSettings.days.length ? notificationSettings.days : [1, 3, 7],
            });
          }}
        />
        <View style={styles.chips}>
          {[1, 3, 7].map((day) => (
            <Chip
              key={day}
              label={`${day}일 전`}
              active={expiryEnabled && notificationSettings.days.includes(day)}
              onPress={() => {
                if (!expiryEnabled) return;
                const days = notificationSettings.days.includes(day)
                  ? notificationSettings.days.filter((item) => item !== day)
                  : [...notificationSettings.days, day].sort((a, b) => a - b);
                setNotificationSettings({ ...notificationSettings, days });
              }}
            />
          ))}
        </View>
        {user?.role === 'consumer' && (
          <ToggleRow
            label="할인 알림"
            description="내 주소 주변 판매자가 할인 정보를 등록하면 알려줍니다."
            active={notificationSettings.discountEnabled}
            onPress={() => {
              if (notificationSettings.discountEnabled) {
                updateSettings({ discountEnabled: false });
                return;
              }
              confirmEnablePush({ discountEnabled: true });
            }}
          />
        )}
        <Button label="알림 설정 저장" onPress={() => saveNotificationSettings(notificationSettings)} />
      </Card>
      <Card>
        <Text style={styles.cardTitle}>위치 정보</Text>
        {address ? (
          <>
            <Text style={styles.muted}>{address.address}</Text>
            {address.detailAddress ? <Text style={styles.muted}>상세주소 {address.detailAddress}</Text> : null}
            <Text style={styles.muted}>우편번호 {address.postcode}</Text>
          </>
        ) : (
          <Text style={styles.muted}>등록된 주소가 없습니다.</Text>
        )}
        <Button label={address ? '위치 변경' : '위치 등록'} onPress={openAddress} />
        {address && user?.role === 'consumer' && <Button label="위치 정보 제거" variant="danger" onPress={deleteAddress} />}
        {user?.role === 'seller' && <Text style={styles.muted}>판매자 계정은 위치 변경만 가능합니다.</Text>}
      </Card>
      {notifications.length ? (
        <Card>
          <Text style={styles.cardTitle}>최근 알림</Text>
          {notifications.slice(0, 5).map((item) => (
            <Text key={item.id} style={styles.muted}>{item.type === 'expiry' ? '소비기한' : '할인'} · {item.body}</Text>
          ))}
        </Card>
      ) : null}
      <Button label="로그아웃" variant="dark" onPress={logout} />
    </View>
  );
}

function AddressPicker({ visible, onClose, onPicked }) {
  const html = `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>
          html, body, #postcode { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
          #loading { padding: 18px; color: #0284c7; font-size: 16px; font-weight: 800; }
        </style>
      </head>
      <body>
        <div id="postcode"><div id="loading">카카오 우편번호 서비스를 불러오는 중입니다.</div></div>
        <script>
          function sendMessage(payload) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
          function bootPostcode() {
            if (!window.daum || !window.daum.Postcode) {
              setTimeout(bootPostcode, 250);
              return;
            }
            new daum.Postcode({
              width: '100%',
              height: '100%',
              oncomplete: function(data) {
                sendMessage({
                  postcode: data.zonecode || '',
                  address: data.roadAddress || data.jibunAddress || data.autoRoadAddress || data.autoJibunAddress || '',
                  detailAddress: ''
                });
              }
            }).embed(document.getElementById('postcode'));
          }
        </script>
        <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" onload="bootPostcode()" onerror="sendMessage({ error: 'postcode_load_failed' })"></script>
      </body>
    </html>
  `;
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.safe}>
        <View style={styles.modalHeader}>
          <Text style={styles.brand}>주소 검색</Text>
          <Button label="닫기" small variant="secondary" onPress={onClose} />
        </View>
        <WebView
          style={styles.webview}
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://postcode.map.kakao.com' }}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          onMessage={(event) => {
            try {
              const picked = JSON.parse(event.nativeEvent.data);
              if (picked?.error) throw new Error(picked.error);
              const normalized = normalizeAddressPayload(picked);
              if (!normalized.address) throw new Error('invalid address');
              onPicked(normalized);
            } catch {
              Alert.alert('주소 선택 오류', '주소 정보를 가져오지 못했습니다. 다시 선택해 주세요.');
            }
          }}
          onError={() => Alert.alert('주소 검색 오류', '주소 검색 화면을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')}
        />
      </SafeAreaView>
    </Modal>
  );
}
function DetailAddressModal({ address, detailAddress, setDetailAddress, onClose, onSave }) {
  return (
    <Modal visible={Boolean(address)} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.cardTitle}>상세주소 입력</Text>
          <Text style={styles.muted}>{address?.address}</Text>
          <Input label="상세주소" value={detailAddress} onChangeText={setDetailAddress} placeholder="예: 101동 1203호" />
          <View style={styles.row}>
            <Button label="취소" variant="secondary" onPress={onClose} />
            <Button label="저장" onPress={onSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Screen({ children }) {
  return <SafeAreaView style={styles.safe}><Watermark /><ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}

function Centered({ text }) {
  return <SafeAreaView style={[styles.safe, styles.center]}><Watermark /><ActivityIndicator color="#0284c7" /><Text style={styles.muted}>{text}</Text></SafeAreaView>;
}

function Watermark() {
  return (
    <View pointerEvents="none" style={styles.watermarkLayer}>
      <Image source={appIcon} style={styles.watermarkIcon} resizeMode="contain" />
      <Text style={styles.watermarkText}>Food Manager</Text>
    </View>
  );
}

function Title({ kicker, title }) {
  return <View><Text style={styles.kicker}>{kicker}</Text><Text style={styles.title}>{title}</Text></View>;
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function Button({ label, onPress, variant = 'primary', small = false }) {
  return (
    <Pressable style={[styles.button, styles[`${variant}Button`], small && styles.smallButton]} onPress={onPress}>
      <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({ label, description, active, onPress }) {
  return (
    <Pressable style={styles.toggleRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{label}</Text>
        {description ? <Text style={styles.muted}>{description}</Text> : null}
      </View>
      <View style={[styles.toggleTrack, active && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, active && styles.toggleThumbOn]} />
      </View>
    </Pressable>
  );
}

function DateField({ label, value, onChange, disabled = false, minDate }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.dateField, disabled && styles.dateFieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={[styles.dateValue, !value && styles.datePlaceholder]}>
          {disabled ? '소비기한 없음' : value || '날짜 선택'}
        </Text>
        <Text style={styles.dateIcon}>📅</Text>
      </Pressable>
      <CalendarModal
        visible={open}
        value={value}
        minDate={minDate}
        onClose={() => setOpen(false)}
        onPick={(nextDate) => {
          onChange(nextDate);
          setOpen(false);
        }}
      />
    </View>
  );
}

function CalendarModal({ visible, value, minDate, onClose, onPick }) {
  const [monthDate, setMonthDate] = useState(parseDate(value || minDate || todayIso()));

  useEffect(() => {
    if (visible) setMonthDate(parseDate(value || minDate || todayIso()));
  }, [visible, value, minDate]);

  const cells = getCalendarCells(monthDate);
  const monthLabel = `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.calendarDialog}>
          <View style={styles.calendarHeader}>
            <Button label="‹" small variant="secondary" onPress={() => setMonthDate(addMonths(monthDate, -1))} />
            <Text style={styles.calendarTitle}>{monthLabel}</Text>
            <Button label="›" small variant="secondary" onPress={() => setMonthDate(addMonths(monthDate, 1))} />
          </View>
          <View style={styles.calendarGrid}>
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <Text key={day} style={styles.weekday}>{day}</Text>
            ))}
            {cells.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
              const dateValue = formatDate(date);
              const active = value === dateValue;
              const disabled = minDate ? dateValue < minDate : false;
              return (
                <Pressable
                  key={dateValue}
                  style={[styles.dayCell, active && styles.dayCellActive, disabled && styles.dayCellDisabled]}
                  disabled={disabled}
                  onPress={() => onPick(dateValue)}
                >
                  <Text style={[styles.dayText, active && styles.dayTextActive, disabled && styles.dayTextDisabled]}>
                    {date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.row}>
            <Button label="오늘" variant="secondary" small onPress={() => onPick(minDate && todayIso() < minDate ? minDate : todayIso())} />
            <Button label="닫기" variant="secondary" small onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#94a3b8"
        keyboardType="default"
        autoCorrect={false}
        autoCapitalize="none"
        textContentType="none"
        importantForAutofill="no"
        allowFontScaling={false}
        {...props}
      />
    </View>
  );
}

function todayIso() {
  return formatDate(new Date());
}

function parseDate(value) {
  const parsed = new Date(`${value || todayIso()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < firstDay; index += 1) cells.push(null);
  for (let day = 1; day <= lastDate; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatBusinessNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function getFoodName(food) {
  return food?.itemName || food?.name || food?.foodName || '식료품';
}

function sortFoods(items) {
  return [...(items || [])].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return String(a.expiryDate).localeCompare(String(b.expiryDate));
  });
}

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return { label: '기한 없음', dateLabel: '', cardStyle: 'freshCard', textStyle: 'statusFresh', key: 'none' };
  const diff = calculateDaysUntilDate(expiryDate);
  if (diff < 0) return { label: '소비기한 지남', dateLabel: expiryDate, cardStyle: 'expiredCard', textStyle: 'statusDanger', key: 'expired' };
  if (diff <= 3) return { label: `${diff}일 남음`, dateLabel: expiryDate, cardStyle: 'soonCard', textStyle: 'statusSoon', key: 'soon' };
  return { label: '여유', dateLabel: expiryDate, cardStyle: 'freshCard', textStyle: 'statusFresh', key: 'fresh' };
}

function calculateDaysUntilDate(targetDate, baseDate = todayIso()) {
  const target = new Date(`${targetDate}T00:00:00`);
  const base = new Date(`${baseDate}T00:00:00`);
  return Math.ceil((target - base) / 86400000);
}

function formatExpiryRemainingMessage(daysUntilExpiry) {
  if (daysUntilExpiry <= 0) return '오늘까지입니다.';
  return `${daysUntilExpiry}일 남았습니다.`;
}

function filterFoods(items, searchForm) {
  const keyword = normalizeText(searchForm.keyword);
  return items.filter((food) => {
    const matchesKeyword = !keyword || normalizeText(`${getFoodName(food)} ${food.category || ''} ${food.subcategory || ''}`).includes(keyword);
    const matchesCategory = searchForm.category === '전체' || food.category === searchForm.category;
    const matchesExpiry = searchForm.expiry === 'all' || getExpiryStatus(food.expiryDate).key === searchForm.expiry;
    return matchesKeyword && matchesCategory && matchesExpiry;
  });
}

function validateSaleDraft(form, foods) {
  if (!form.foodId) return '할인할 식료품을 선택해 주세요.';
  const selectedFood = foods.find((food) => String(food.id) === String(form.foodId));
  if (!selectedFood) return '이미 할인 등록된 식료품입니다.';
  const saleQuantity = Number(form.saleQuantity);
  if (!Number.isFinite(saleQuantity) || saleQuantity < 0) return '할인 등록 수량은 0개 이상이어야 합니다.';
  const originalPrice = Number(form.originalPrice);
  const salePrice = Number(form.salePrice);
  if (!originalPrice || originalPrice <= 0) return '정가를 입력해 주세요.';
  if (!salePrice || salePrice <= 0) return '할인가를 입력해 주세요.';
  if (salePrice >= originalPrice) return '할인가는 정가보다 낮아야 합니다.';
  const today = new Date().toISOString().slice(0, 10);
  if (form.startDate < today) return '시작일은 오늘 이후여야 합니다.';
  if (form.endDate < form.startDate) return '종료일은 시작일 이후여야 합니다.';
  return '';
}

function getRecipeImage(recipe) {
  const raw = recipe?.ATT_FILE_NO_MAIN || recipe?.ATT_FILE_NO_MK || recipe?.imageUrl || recipe?.image || '';
  const url = String(raw || '').trim();
  if (!url) return '';
  return url;
}

function getRecipeManuals(recipe) {
  if (!recipe) return [];
  return Array.from({ length: 20 }, (_, index) => recipe[`MANUAL${String(index + 1).padStart(2, '0')}`]).filter(Boolean);
}

function getRecipeMeta(recipe) {
  const calories = Number(recipe.INFO_ENG || 0);
  const manualCount = getRecipeManuals(recipe).length;
  const difficulty = manualCount >= 8 || calories >= 600 ? '어려움' : manualCount >= 5 ? '보통' : '쉬움';
  const cookingTime = manualCount >= 8 ? '40분 이상' : manualCount >= 5 ? '20~40분' : '20분 이내';
  return { difficulty, cookingTime };
}

const knownIngredientNames = [
  '닭가슴살', '느타리버섯', '표고버섯', '새송이버섯', '국거리용 소고기', '소고기', '돼지고기', '삼겹살', '닭고기',
  '마늘', '소금', '후추', '양파', '대파', '쪽파', '파', '고추', '청양고추', '당근', '감자', '토마토',
  '김치', '배추', '상추', '애호박', '호박', '버섯', '두부', '계란', '달걀', '우유', '치즈', '사과', '바나나', '딸기', '포도',
  '간장', '설탕', '식초', '참기름', '식용유', '고추장', '된장', '고춧가루', '깨', '물'
].sort((a, b) => b.length - a.length);

const ingredientStopWords = new Set([
  '재료', '주재료', '부재료', '양념', '양념장', '소스', '육수', '국물', '고명', '장식', '선택',
  '약간', '적당량', '다진', '다짐', '다져', '간', '채썬', '채', '썬', '슬라이스', '작게', '크게', '것'
]);

function normalizeIngredientText(value) {
  return String(value || '').replace(/\s/g, '').toLowerCase();
}

function cleanIngredientName(value) {
  const raw = String(value || '');
  const cleaned = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:g|kg|ml|l|L|컵|큰술|작은술|스푼|T|t|개|장|쪽|알|마리|줄기|줌|봉|팩|캔|병|통|근|cm|㎖|㎏|그램|킬로그램|리터)/gi, ' ')
    .replace(/\d+(?:\.\d+)?/g, ' ')
    .replace(/[^가-힣A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedSource = normalizeIngredientText(`${raw} ${cleaned}`);
  const knownName = knownIngredientNames.find((name) => normalizedSource.includes(normalizeIngredientText(name)));
  if (knownName) return knownName;

  const words = cleaned
    .split(' ')
    .map((word) => word.replace(/(다진|다짐|다져|채썬|썬|슬라이스|적당량|약간|조금|것)$/g, ''))
    .filter((word) => word.length >= 2 && !ingredientStopWords.has(word));
  return words[0] || '';
}

function getRecipeIngredientNames(recipe) {
  const ingredientText = recipe?.RCP_PARTS_DTLS || recipe?.ingredients || '';
  const chunks = String(ingredientText).split(new RegExp('[,\\n·ㆍ;/]+')).map(cleanIngredientName).filter(Boolean);
  return [...new Set(chunks)].slice(0, 20);
}

function isIngredientMatched(ingredient, ownedNames) {
  const normalizedIngredient = normalizeText(ingredient);
  return (ownedNames || [])
    .map(normalizeText)
    .filter(Boolean)
    .some((ownedName) => normalizedIngredient.includes(ownedName) || ownedName.includes(normalizedIngredient));
}

function getRecipeAvailability(recipe, ownedNames) {
  const ingredients = getRecipeIngredientNames(recipe);
  const matchedCount = ingredients.filter((ingredient) => isIngredientMatched(ingredient, ownedNames)).length;
  const missingCount = ingredients.length - matchedCount;
  const canMake = ingredients.length > 0 && missingCount === 0;
  const matchRate = ingredients.length ? matchedCount / ingredients.length : 0;
  return { canMake, missingCount, matchedCount, matchRate };
}

function compareRecipeAvailability(a, b, ownedNames) {
  const left = getRecipeAvailability(a, ownedNames);
  const right = getRecipeAvailability(b, ownedNames);
  if (left.canMake !== right.canMake) return left.canMake ? -1 : 1;
  if (left.missingCount !== right.missingCount) return left.missingCount - right.missingCount;
  if (right.matchRate !== left.matchRate) return right.matchRate - left.matchRate;
  return right.matchedCount - left.matchedCount;
}

function countMatchingIngredientsForRecipe(recipe, ownedNames) {
  return getRecipeAvailability(recipe, ownedNames).matchedCount;
}

function findMissingIngredientsForRecipe(recipe, ownedNames) {
  return getRecipeIngredientNames(recipe).filter((item) => !isIngredientMatched(item, ownedNames));
}

function formatMissingIngredients(items) {
  return (items || []).join(', ');
}

function normalizeText(value) {
  return String(value || '').replace(/\s/g, '').toLowerCase();
}

function normalizeAddressPayload(addressInfo) {
  return {
    postcode: String(addressInfo?.postcode || addressInfo?.zonecode || '00000').trim() || '00000',
    address: String(addressInfo?.address || addressInfo?.roadAddress || addressInfo?.jibunAddress || '').trim(),
    detailAddress: String(addressInfo?.detailAddress || '').trim(),
  };
}

function fromNotificationResponse(saved) {
  if (!saved) return notificationDefaults;
  return {
    enabled: Boolean(saved.enabled),
    days: [
      saved.notify1day ? 1 : null,
      saved.notify3day ? 3 : null,
      saved.notify7day ? 7 : null,
    ].filter(Boolean),
    discountEnabled: saved.discountEnabled !== false,
  };
}

function toNotificationRequest(settings) {
  const days = settings.enabled ? settings.days : [];
  return {
    enabled: Boolean(settings.enabled),
    notify1day: days.includes(1),
    notify3day: days.includes(3),
    notify7day: days.includes(7),
    discountEnabled: Boolean(settings.discountEnabled),
  };
}

function getAddressRegion(addressInfo) {
  const raw = String(addressInfo?.address || '').trim();
  if (!raw) return '';
  const tokens = raw.split(/\s+/).filter(Boolean);
  return tokens.find((token) => /(특별시|광역시|특별자치시|시)$/.test(token)) || tokens[0] || '';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f9ff' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { minHeight: 72, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#bae6fd', backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 3 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  brandIcon: { width: 38, height: 38 },
  brand: { fontSize: 24, fontWeight: '900', color: '#020617' },
  scroll: { flex: 1, zIndex: 1 },
  content: { padding: 18, paddingBottom: 118, gap: 18 },
  loader: { marginTop: 10, zIndex: 2 },
  watermarkLayer: { position: 'absolute', top: 132, left: 0, right: 0, alignItems: 'center', opacity: 0.075, zIndex: 0 },
  watermarkIcon: { width: 190, height: 190 },
  watermarkText: { marginTop: 4, color: '#075985', fontSize: 34, fontWeight: '900', textAlign: 'center' },
  toast: { margin: 16, marginBottom: 0, padding: 14, borderRadius: 14, color: '#075985', backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#7dd3fc', fontWeight: '900', lineHeight: 22, zIndex: 2 },
  hero: { minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: 14 },
  heroIcon: { width: 104, height: 104 },
  heroTitle: { fontSize: 38, fontWeight: '900', color: '#020617', textAlign: 'center' },
  heroText: { fontSize: 16, fontWeight: '700', color: '#64748b', textAlign: 'center', lineHeight: 24 },
  stack: { gap: 16 },
  kicker: { color: '#0284c7', fontWeight: '900', fontSize: 15 },
  title: { color: '#020617', fontWeight: '900', fontSize: 34, marginTop: 4, lineHeight: 42 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#dbe4ee', gap: 14, shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardTitle: { fontSize: 22, fontWeight: '900', color: '#020617', lineHeight: 28 },
  muted: { color: '#64748b', fontWeight: '700', lineHeight: 22 },
  price: { color: '#dc2626', fontWeight: '900', fontSize: 22 },
  stockHint: { color: '#0284c7', fontWeight: '900' },
  group: { gap: 8 },
  groupTitle: { color: '#0c4a6e', fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#dbe4ee' },
  chipActive: { backgroundColor: '#075985', borderColor: '#075985' },
  chipText: { color: '#334155', fontWeight: '900', fontSize: 15 },
  chipTextActive: { color: '#ffffff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  toggleTitle: { color: '#020617', fontWeight: '900', fontSize: 17 },
  toggleTrack: { width: 56, height: 32, borderRadius: 999, backgroundColor: '#cbd5e1', padding: 3, justifyContent: 'center' },
  toggleTrackOn: { backgroundColor: '#0284c7' },
  toggleThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#ffffff', shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  toggleThumbOn: { alignSelf: 'flex-end' },
  inputGroup: { gap: 7, flex: 1 },
  label: { fontSize: 15, color: '#334155', fontWeight: '900' },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 16, color: '#020617', backgroundColor: '#f8fafc', fontWeight: '800', fontSize: 16 },
  dateField: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 16, backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dateFieldDisabled: { backgroundColor: '#e2e8f0', opacity: 0.75 },
  dateValue: { color: '#020617', fontWeight: '900', fontSize: 16 },
  datePlaceholder: { color: '#94a3b8' },
  dateIcon: { fontSize: 22 },
  calendarDialog: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, gap: 16 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  calendarTitle: { flex: 1, textAlign: 'center', color: '#020617', fontSize: 20, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  weekday: { width: '12.55%', textAlign: 'center', color: '#0284c7', fontWeight: '900', paddingVertical: 6 },
  dayCell: { width: '12.55%', aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  dayCellEmpty: { width: '12.55%', aspectRatio: 1 },
  dayCellActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  dayCellDisabled: { backgroundColor: '#f1f5f9', opacity: 0.45 },
  dayText: { color: '#334155', fontWeight: '900' },
  dayTextActive: { color: '#ffffff' },
  dayTextDisabled: { color: '#94a3b8' },
  button: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  smallButton: { minHeight: 40, paddingHorizontal: 14 },
  primaryButton: { backgroundColor: '#0284c7' },
  secondaryButton: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1' },
  dangerButton: { backgroundColor: '#e11d48' },
  darkButton: { backgroundColor: '#020617' },
  buttonText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  secondaryButtonText: { color: '#334155' },
  nav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', padding: 10, paddingBottom: 18, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#dbe4ee', zIndex: 4 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 18 },
  navActive: { backgroundColor: '#dbeafe' },
  navIcon: { fontSize: 27 },
  navText: { fontSize: 13, color: '#475569', fontWeight: '900' },
  modalHeader: { minHeight: 68, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#dbe4ee', backgroundColor: '#ffffff' },
  overlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.55)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, gap: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' },
  betweenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  twoColumns: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: { flexGrow: 1, flexBasis: '29%', minHeight: 82, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4ee', alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  actionButtonActive: { backgroundColor: '#075985', borderColor: '#075985' },
  actionEmoji: { fontSize: 28 },
  actionText: { fontSize: 15, color: '#334155', fontWeight: '900' },
  actionTextActive: { color: '#ffffff' },
  foodHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  foodBigIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#e0f2fe', textAlign: 'center', textAlignVertical: 'center', fontSize: 36, overflow: 'hidden' },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#dbe4ee', shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  selectedRow: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  foodIcon: { fontSize: 30, width: 38, textAlign: 'center' },
  foodName: { fontSize: 19, color: '#020617', fontWeight: '900', lineHeight: 25 },
  expiryLabel: { minWidth: 80, textAlign: 'right', fontWeight: '900', lineHeight: 19 },
  statusFresh: { color: '#0284c7' },
  statusSoon: { color: '#d97706' },
  statusDanger: { color: '#dc2626' },
  freshCard: { borderColor: '#bae6fd' },
  soonCard: { borderColor: '#fed7aa', backgroundColor: '#fffbeb' },
  expiredCard: { borderColor: '#fca5a5', backgroundColor: '#fff1f2' },
  checkBox: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#cbd5e1', color: 'transparent', textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden' },
  checkBoxOn: { backgroundColor: '#0284c7', borderColor: '#0284c7', color: '#ffffff', fontWeight: '900' },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pickCard: { flexBasis: '47%', flexGrow: 1, minHeight: 112, borderRadius: 18, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4ee', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 },
  pickEmoji: { fontSize: 34 },
  pickText: { color: '#334155', fontWeight: '900', fontSize: 16, textAlign: 'center' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dbe4ee', backgroundColor: '#f8fafc' },
  saleBadge: { alignItems: 'flex-end', gap: 4 },
  salePrice: { color: '#dc2626', fontWeight: '900', fontSize: 18 },
  saleRate: { color: '#ffffff', backgroundColor: '#ef4444', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '900' },
  recipeCard: { flexDirection: 'row', gap: 14, backgroundColor: '#ffffff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#dbe4ee', shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  recipeCardBody: { flex: 1, gap: 8 },
  recipeThumb: { width: 92, height: 92, borderRadius: 16, backgroundColor: '#e2e8f0' },
  recipeThumbFallback: { width: 92, height: 92, borderRadius: 16, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  recipeThumbEmoji: { fontSize: 34 },
  recipeImage: { width: '100%', height: 220, borderRadius: 20, backgroundColor: '#e2e8f0' },
  recipeImageFallback: { height: 180, borderRadius: 20, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  recipeImageFallbackText: { fontSize: 56 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '900', fontSize: 13 },
  difficultyPill: { color: '#7c2d12', backgroundColor: '#ffedd5' },
  timePill: { color: '#075985', backgroundColor: '#e0f2fe' },
  missingText: { color: '#ea580c', fontWeight: '900', lineHeight: 20 },
  missingDetailText: { color: '#dc2626', backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, fontWeight: '900', lineHeight: 22 },
  readyText: { color: '#0284c7', fontWeight: '900' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoBox: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  difficultyBox: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  timeBox: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  infoLabel: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  infoValue: { color: '#020617', fontSize: 15, fontWeight: '900', marginTop: 4 },
  difficultyText: { color: '#ea580c' },
  timeText: { color: '#0284c7' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0284c7' },
  recipeStep: { color: '#334155', fontWeight: '700', lineHeight: 23 },
  webview: { flex: 1, backgroundColor: '#ffffff' },
});



