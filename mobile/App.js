import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { api, clearSession, readApiDebugInfo, readUser, saveSession, setApiBaseUrlOverride } from './src/api';
import { firstFood, foodGroups, unitOptions, defaultExpiryDate } from './src/food';
import { showLocalNotification } from './src/notifications';

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
    expiryDate: defaultExpiryDate(),
    noExpiry: false,
  });
  const [saleForm, setSaleForm] = useState({
    foodId: '',
    originalPrice: '',
    salePrice: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  });
  const [notificationSettings, setNotificationSettings] = useState(notificationDefaults);
  const [apiInfo, setApiInfo] = useState({ configuredBaseUrl: '', overrideBaseUrl: '', candidates: [] });
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState('');

  const visibleTabs = user?.role === 'seller' ? tabs.seller : tabs.consumer;
  const activeSaleFoodIds = useMemo(() => new Set(sales.map((sale) => Number(sale.foodId))), [sales]);
  const saleableFoods = foods.filter((food) => !activeSaleFoodIds.has(Number(food.id)));

  useEffect(() => {
    (async () => {
      const nextApiInfo = await readApiDebugInfo();
      setApiInfo(nextApiInfo);
      setApiBaseUrlInput(nextApiInfo.overrideBaseUrl || nextApiInfo.configuredBaseUrl || '');
      const savedUser = await readUser();
      setUser(savedUser);
      setStarted(Boolean(savedUser));
      setBooting(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshAll();
  }, [user]);

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

  async function refreshApiInfo() {
    const nextApiInfo = await readApiDebugInfo();
    setApiInfo(nextApiInfo);
    setApiBaseUrlInput(nextApiInfo.overrideBaseUrl || nextApiInfo.configuredBaseUrl || '');
    return nextApiInfo;
  }

  async function saveApiBaseUrl() {
    await withLoading(async () => {
      await setApiBaseUrlOverride(apiBaseUrlInput);
      await refreshApiInfo();
      setMessage('백엔드 주소를 저장했습니다.');
    });
  }

  async function testBackendConnection() {
    await withLoading(async () => {
      const health = await api('/api/health');
      await refreshApiInfo();
      setMessage(health?.ok ? '백엔드 연결이 정상입니다.' : '백엔드 응답을 확인했습니다.');
    });
  }

  async function refreshAll() {
    await withLoading(async () => {
      const [nextFoods, nextAddress, nextNotifications] = await Promise.all([
        api('/api/foods'),
        api('/api/me/address').catch(() => null),
        api('/api/notifications').catch(() => []),
      ]);
      setFoods(Array.isArray(nextFoods) ? nextFoods : []);
      setAddress(nextAddress?.address ? nextAddress : null);
      setNotifications(Array.isArray(nextNotifications) ? nextNotifications : []);
      await loadSales(nextAddress);
    });
  }

  async function loadSales(addressOverride = address) {
    const region = user?.role === 'seller' ? '' : getAddressRegion(addressOverride);
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
    });
  }

  async function signup(role) {
    await withLoading(async () => {
      const data = await api(`/api/auth/signup/${role}`, {
        method: 'POST',
        body: JSON.stringify({
          ...authForm,
          businessNumber: String(authForm.businessNumber || '').replace(/\D/g, ''),
        }),
      });
      await saveSession(data);
      setUser(data.user);
      setStarted(true);
      setScreen('foods');
    });
  }

  async function logout() {
    await clearSession();
    setUser(null);
    setStarted(false);
    setScreen('foods');
    setFoods([]);
    setSales([]);
    setRecipes([]);
    setNotifications([]);
    setAddress(null);
  }

  async function saveFood() {
    await withLoading(async () => {
      await api('/api/foods', {
        method: 'POST',
        body: JSON.stringify({
          ...foodForm,
          name: foodForm.itemName,
          price: 0,
          quantity: Number(foodForm.quantity),
          expiryDate: foodForm.noExpiry ? null : foodForm.expiryDate,
        }),
      });
      setMessage(`${foodForm.itemName}을 추가했습니다.`);
      setFoodForm({ ...firstFood, quantity: '1', unit: '개', expiryDate: defaultExpiryDate(), noExpiry: false });
      const nextFoods = await api('/api/foods');
      setFoods(nextFoods);
    });
  }

  async function deleteFood(id) {
    await withLoading(async () => {
      await api(`/api/foods/${id}`, { method: 'DELETE' });
      setFoods(await api('/api/foods'));
    });
  }

  async function createSale() {
    await withLoading(async () => {
      await api('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          foodId: Number(saleForm.foodId),
          originalPrice: Number(saleForm.originalPrice),
          salePrice: Number(saleForm.salePrice),
          startDate: saleForm.startDate,
          endDate: saleForm.endDate,
        }),
      });
      setMessage('할인 정보를 등록했습니다.');
      await loadSales();
    });
  }

  async function deleteSale(id) {
    await withLoading(async () => {
      await api(`/api/sales/${id}`, { method: 'DELETE' });
      await loadSales();
    });
  }

  async function recommendRecipes() {
    await withLoading(async () => {
      const names = Array.from(new Set(foods.map((food) => food.itemName || food.name).filter(Boolean))).slice(0, 4);
      const results = await Promise.allSettled(names.map((name) => api(`/api/recipes?query=${encodeURIComponent(name)}`)));
      const rows = results.flatMap((result) => {
        if (result.status !== 'fulfilled') return [];
        return result.value?.items || result.value?.recipes || result.value?.COOKRCP01?.row || [];
      });
      setRecipes(rows.slice(0, 20));
    });
  }

  async function saveAddress(nextAddress) {
    await withLoading(async () => {
      const saved = await api('/api/me/address', {
        method: 'PUT',
        body: JSON.stringify(nextAddress),
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

  async function testExpiryNotification() {
    await withLoading(async () => {
      const data = await api('/api/notifications/expiry', {
        method: 'POST',
        body: JSON.stringify({ days: notificationSettings.days }),
      });
      setNotifications(Array.isArray(data) ? data : []);
      await showLocalNotification('Food Manager 소비기한 알림', '소비기한 알림 기록을 확인해 주세요.');
    });
  }

  function chooseFood(category, itemName, emoji) {
    setFoodForm((current) => ({ ...current, category, subcategory: category, itemName, emoji }));
  }

  if (booting) {
    return <Centered text="앱을 준비하는 중" />;
  }

  if (!started && !user) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🧊</Text>
          <Text style={styles.heroTitle}>Food Manager</Text>
          <Text style={styles.heroText}>식료품, 할인, 레시피를 한 곳에서 관리하세요.</Text>
        </View>
        <Button label="로그인" onPress={() => { setStarted(true); setScreen('auth'); setAuthMode('login'); }} />
        <Button label="회원가입" variant="secondary" onPress={() => { setStarted(true); setScreen('auth'); setAuthMode('consumer'); }} />
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>🧊 Food Manager</Text>
        {!user && <Button label="로그인" small onPress={() => setScreen('auth')} />}
      </View>
      {message ? <Text style={styles.toast}>{message}</Text> : null}
      {loading ? <ActivityIndicator style={styles.loader} color="#047857" /> : null}
      <ScrollView contentContainerStyle={styles.content}>
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
        {screen === 'foods' && (
          <FoodsView
            foods={foods}
            foodForm={foodForm}
            setFoodForm={setFoodForm}
            chooseFood={chooseFood}
            saveFood={saveFood}
            deleteFood={deleteFood}
          />
        )}
        {screen === 'sales' && (
          <SalesView
            user={user}
            address={address}
            sales={sales}
            saleForm={saleForm}
            setSaleForm={setSaleForm}
            saleableFoods={saleableFoods}
            createSale={createSale}
            deleteSale={deleteSale}
            openAddress={() => setAddressPickerOpen(true)}
          />
        )}
        {screen === 'recipes' && (
          <RecipesView recipes={recipes} foods={foods} recommendRecipes={recommendRecipes} />
        )}
        {screen === 'settings' && (
          <SettingsView
            user={user}
            address={address}
            notifications={notifications}
            notificationSettings={notificationSettings}
            setNotificationSettings={setNotificationSettings}
            openAddress={() => setAddressPickerOpen(true)}
            deleteAddress={deleteAddress}
            testExpiryNotification={testExpiryNotification}
            apiInfo={apiInfo}
            apiBaseUrlInput={apiBaseUrlInput}
            setApiBaseUrlInput={setApiBaseUrlInput}
            saveApiBaseUrl={saveApiBaseUrl}
            testBackendConnection={testBackendConnection}
            logout={logout}
          />
        )}
      </ScrollView>
      <View style={styles.nav}>
        {visibleTabs.map(([id, label, icon]) => (
          <Pressable key={id} style={[styles.navItem, screen === id && styles.navActive]} onPress={() => setScreen(id)}>
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
            setAuthForm((current) => ({ ...current, ...picked }));
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
          const nextAddress = { ...pendingAddress, detailAddress };
          setPendingAddress(null);
          saveAddress(nextAddress);
        }}
      />
    </SafeAreaView>
  );
}

function AuthView({ authMode, setAuthMode, form, setForm, login, signup, openAddress }) {
  const isSeller = authMode === 'seller';
  return (
    <View style={styles.stack}>
      <Title title={authMode === 'login' ? '로그인' : isSeller ? '판매자 회원가입' : '소비자 회원가입'} />
      <Input label="아이디" value={form.userId} onChangeText={(userId) => setForm({ ...form, userId })} />
      <Input label="비밀번호" secureTextEntry value={form.password} onChangeText={(password) => setForm({ ...form, password })} />
      {authMode !== 'login' && <Input label="이름" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />}
      {isSeller && (
        <>
          <Input label="상호명" value={form.businessName} onChangeText={(businessName) => setForm({ ...form, businessName })} />
          <Input label="사업자 이름" value={form.businessOwnerName} onChangeText={(businessOwnerName) => setForm({ ...form, businessOwnerName })} />
          <Input label="사업자번호" value={form.businessNumber} onChangeText={(businessNumber) => setForm({ ...form, businessNumber })} />
          <Button label={form.address ? `주소 선택됨: ${form.address}` : '사업장 주소 검색'} onPress={openAddress} variant="secondary" />
          <Input label="상세주소" value={form.detailAddress} onChangeText={(detailAddress) => setForm({ ...form, detailAddress })} />
        </>
      )}
      {authMode === 'login' ? (
        <>
          <Button label="로그인" onPress={login} />
          <Button label="소비자 회원가입" variant="secondary" onPress={() => setAuthMode('consumer')} />
          <Button label="판매자 회원가입" variant="secondary" onPress={() => setAuthMode('seller')} />
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

function FoodsView({ foods, foodForm, setFoodForm, chooseFood, saveFood, deleteFood }) {
  return (
    <View style={styles.stack}>
      <Title title="오늘 관리할 식료품" kicker="식료품" />
      <Card>
        <Text style={styles.cardTitle}>{foodForm.emoji} {foodForm.itemName}</Text>
        {foodGroups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupTitle}>{group.label}</Text>
            <View style={styles.chips}>
              {group.items.map(([name, emoji]) => (
                <Chip key={name} label={`${emoji} ${name}`} active={foodForm.itemName === name} onPress={() => chooseFood(group.label, name, emoji)} />
              ))}
            </View>
          </View>
        ))}
        <Input label="수량" keyboardType="number-pad" value={foodForm.quantity} onChangeText={(quantity) => setFoodForm({ ...foodForm, quantity })} />
        <View style={styles.chips}>
          {unitOptions.map((unit) => <Chip key={unit} label={unit} active={foodForm.unit === unit} onPress={() => setFoodForm({ ...foodForm, unit })} />)}
        </View>
        <Input label="소비기한" value={foodForm.expiryDate} onChangeText={(expiryDate) => setFoodForm({ ...foodForm, expiryDate, noExpiry: false })} />
        <Chip label="소비기한 없음" active={foodForm.noExpiry} onPress={() => setFoodForm({ ...foodForm, noExpiry: !foodForm.noExpiry })} />
        <Button label="식료품 추가" onPress={saveFood} />
      </Card>
      {foods.map((food) => (
        <Card key={food.id}>
          <Text style={styles.cardTitle}>{food.emoji || '🍽️'} {food.itemName}</Text>
          <Text style={styles.muted}>{food.category} · {food.quantity}{food.unit} · {food.expiryDate || '소비기한 없음'}</Text>
          <Button label="삭제" variant="danger" onPress={() => deleteFood(food.id)} />
        </Card>
      ))}
    </View>
  );
}

function SalesView({ user, address, sales, saleForm, setSaleForm, saleableFoods, createSale, deleteSale, openAddress }) {
  if (user?.role !== 'seller' && !address) {
    return (
      <View style={styles.stack}>
        <Title title="주소 등록이 필요합니다" kicker="할인" />
        <Button label="주소 등록" onPress={openAddress} />
      </View>
    );
  }
  return (
    <View style={styles.stack}>
      <Title title={user?.role === 'seller' ? '할인 정보 관리' : '주변 할인 정보'} kicker="할인" />
      {user?.role === 'seller' && (
        <Card>
          <Text style={styles.cardTitle}>할인 등록</Text>
          <View style={styles.chips}>
            {saleableFoods.map((food) => (
              <Chip key={food.id} label={food.itemName} active={String(saleForm.foodId) === String(food.id)} onPress={() => setSaleForm({ ...saleForm, foodId: String(food.id) })} />
            ))}
          </View>
          {!saleableFoods.length && <Text style={styles.muted}>할인 등록 가능한 식료품이 없습니다.</Text>}
          <Input label="정가" keyboardType="number-pad" value={saleForm.originalPrice} onChangeText={(originalPrice) => setSaleForm({ ...saleForm, originalPrice })} />
          <Input label="할인가" keyboardType="number-pad" value={saleForm.salePrice} onChangeText={(salePrice) => setSaleForm({ ...saleForm, salePrice })} />
          <Input label="시작일" value={saleForm.startDate} onChangeText={(startDate) => setSaleForm({ ...saleForm, startDate })} />
          <Input label="종료일" value={saleForm.endDate} onChangeText={(endDate) => setSaleForm({ ...saleForm, endDate })} />
          <Button label="할인 등록" onPress={createSale} />
        </Card>
      )}
      {sales.map((sale) => (
        <Card key={sale.id}>
          <Text style={styles.cardTitle}>{sale.foodName}</Text>
          <Text style={styles.price}>{Number(sale.salePrice).toLocaleString()}원 · {sale.discountRate}% 할인</Text>
          <Text style={styles.muted}>{sale.startDate} ~ {sale.endDate}</Text>
          {sale.marketName ? <Text style={styles.muted}>{sale.marketName} · {sale.marketAddress}</Text> : null}
          {user?.role === 'seller' && <Button label="삭제" variant="danger" onPress={() => deleteSale(sale.id)} />}
        </Card>
      ))}
    </View>
  );
}

function RecipesView({ recipes, foods, recommendRecipes }) {
  return (
    <View style={styles.stack}>
      <Title title="추천 레시피" kicker="레시피" />
      <Text style={styles.muted}>등록된 식료품: {foods.map((food) => food.itemName).filter(Boolean).join(', ') || '없음'}</Text>
      <Button label="등록 식료품으로 추천받기" onPress={recommendRecipes} />
      {recipes.map((recipe, index) => (
        <Card key={recipe.RCP_SEQ || `${recipe.RCP_NM}-${index}`}>
          <Text style={styles.cardTitle}>{recipe.RCP_NM || recipe.name || '레시피'}</Text>
          <Text style={styles.muted}>{recipe.RCP_PAT2 || '분류 없음'} · {recipe.INFO_ENG ? `${recipe.INFO_ENG}kcal` : '영양정보 없음'}</Text>
        </Card>
      ))}
    </View>
  );
}

function SettingsView({
  user,
  address,
  notifications,
  notificationSettings,
  setNotificationSettings,
  openAddress,
  deleteAddress,
  testExpiryNotification,
  apiInfo,
  apiBaseUrlInput,
  setApiBaseUrlInput,
  saveApiBaseUrl,
  testBackendConnection,
  logout,
}) {
  return (
    <View style={styles.stack}>
      <Title title="내 설정" kicker="설정" />
      <Card>
        <Text style={styles.cardTitle}>{user?.role === 'seller' ? '🏪' : '🧑‍🍳'} {user?.name || user?.userId}</Text>
        <Text style={styles.muted}>{user?.role === 'seller' ? '판매자 계정' : '소비자 계정'}</Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>알림 설정</Text>
        <View style={styles.chips}>
          {[1, 3, 7].map((day) => (
            <Chip
              key={day}
              label={`${day}일 전`}
              active={notificationSettings.days.includes(day)}
              onPress={() => {
                const days = notificationSettings.days.includes(day)
                  ? notificationSettings.days.filter((item) => item !== day)
                  : [...notificationSettings.days, day].sort((a, b) => a - b);
                setNotificationSettings({ ...notificationSettings, days });
              }}
            />
          ))}
        </View>
        <Button label="소비기한 알림 테스트" onPress={testExpiryNotification} />
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
      <Card>
        <Text style={styles.cardTitle}>백엔드 연결</Text>
        <Input
          label="백엔드 주소"
          value={apiBaseUrlInput}
          onChangeText={setApiBaseUrlInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://10.0.2.2:8080"
        />
        <Text style={styles.muted}>기본 주소 {apiInfo.configuredBaseUrl}</Text>
        <Text style={styles.muted}>현재 시도 주소 {(apiInfo.candidates || []).join(', ')}</Text>
        <Text style={styles.muted}>Android Emulator는 보통 http://10.0.2.2:8080 을 사용합니다. adb reverse를 쓰면 http://127.0.0.1:8080 도 가능합니다.</Text>
        <View style={styles.row}>
          <Button label="주소 저장" variant="secondary" onPress={saveApiBaseUrl} />
          <Button label="연결 테스트" onPress={testBackendConnection} />
        </View>
      </Card>
      <Button label="로그아웃" variant="dark" onPress={logout} />
    </View>
  );
}

function AddressPicker({ visible, onClose, onPicked }) {
  const html = `
    <!doctype html>
    <html>
      <head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0">
        <div id="postcode" style="height:100vh"></div>
        <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
        <script>
          new daum.Postcode({
            oncomplete: function(data) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                postcode: data.zonecode,
                address: data.roadAddress || data.jibunAddress,
                detailAddress: ''
              }));
            }
          }).embed(document.getElementById('postcode'));
        </script>
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
        <WebView originWhitelist={['*']} source={{ html }} onMessage={(event) => onPicked(JSON.parse(event.nativeEvent.data))} />
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
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>{children}</ScrollView></SafeAreaView>;
}

function Centered({ text }) {
  return <SafeAreaView style={[styles.safe, styles.center]}><ActivityIndicator color="#047857" /><Text style={styles.muted}>{text}</Text></SafeAreaView>;
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

function Input({ label, ...props }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#94a3b8" {...props} />
    </View>
  );
}

function getAddressRegion(addressInfo) {
  const raw = String(addressInfo?.address || '').trim();
  if (!raw) return '';
  const tokens = raw.split(/\s+/).filter(Boolean);
  return tokens.find((token) => /(특별시|광역시|특별자치시|시)$/.test(token)) || tokens[0] || '';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { height: 64, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 22, fontWeight: '900', color: '#020617' },
  content: { padding: 18, paddingBottom: 110, gap: 16 },
  loader: { marginTop: 10 },
  toast: { margin: 16, marginBottom: 0, padding: 14, borderRadius: 12, color: '#064e3b', backgroundColor: '#d1fae5', fontWeight: '800' },
  hero: { minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: 14 },
  heroIcon: { fontSize: 72 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#020617' },
  heroText: { fontSize: 16, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  stack: { gap: 16 },
  kicker: { color: '#047857', fontWeight: '900', fontSize: 12 },
  title: { color: '#020617', fontWeight: '900', fontSize: 28, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#020617' },
  muted: { color: '#64748b', fontWeight: '700', lineHeight: 20 },
  price: { color: '#dc2626', fontWeight: '900', fontSize: 18 },
  group: { gap: 8 },
  groupTitle: { color: '#065f46', fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#064e3b', borderColor: '#064e3b' },
  chipText: { color: '#334155', fontWeight: '900' },
  chipTextActive: { color: '#fff' },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, color: '#334155', fontWeight: '900' },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 14, color: '#020617', backgroundColor: '#f8fafc', fontWeight: '800' },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  smallButton: { minHeight: 38 },
  primaryButton: { backgroundColor: '#047857' },
  secondaryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
  dangerButton: { backgroundColor: '#e11d48' },
  darkButton: { backgroundColor: '#020617' },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  secondaryButtonText: { color: '#334155' },
  nav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', padding: 10, paddingBottom: 18, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14 },
  navActive: { backgroundColor: '#d1fae5' },
  navIcon: { fontSize: 22 },
  navText: { fontSize: 12, color: '#475569', fontWeight: '900' },
  modalHeader: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  overlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.55)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12 },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
});
