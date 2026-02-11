# Tab Switching Data Persistence Implementation

## 🎯 Vấn Đề

**Trước đây:** Khi user chuyển tab (Home ↔ 30 Ranking ↔ Settings ↔ History), tất cả dữ liệu bị mất:
- ❌ Results đã check → mất hết
- ❌ Keywords/domains đang nhập → bị xóa
- ❌ Settings (location, device) → reset về default
- ❌ Phải làm lại từ đầu mỗi lần chuyển tab

**Hiện tại:** Tất cả dữ liệu được **tự động lưu** và **khôi phục**:
- ✅ Results giữ nguyên khi chuyển tab
- ✅ Form inputs được persist
- ✅ Settings được lưu lại
- ✅ Thông báo khi khôi phục data

---

## 📦 Implementation Overview

### 1. **Custom Hooks Created**

#### [frontend/src/hooks/useLocalStorage.ts](frontend/src/hooks/useLocalStorage.ts)

Tạo 2 hooks mới:

```typescript
// Hook 1: Simple key-value storage
useLocalStorage<T>(key: string, initialValue: T)
// Usage: const [value, setValue] = useLocalStorage('key', defaultValue);

// Hook 2: Complex object state with auto-save
usePersistedState<T>(key: string, initialState: T)
// Usage: const { state, setState, clearState } = usePersistedState('key', {});
```

**Features:**
- Auto-save to localStorage on state change
- Type-safe with TypeScript generics
- Error handling for quota exceeded
- Merge with initial state for schema migrations
- Clear/reset functionality

---

### 2. **SingleCheckPage Persistence**

#### File: [frontend/src/pages/SingleCheckPage.tsx](frontend/src/pages/SingleCheckPage.tsx)

**Changes:**
```typescript
// Before
const [results, setResults] = useState<RankResult[]>([]);

// After
const { state: persistedState, setState: setPersistedState, clearState } = usePersistedState(
  "single_check_state",
  {
    results: [] as RankResult[],
    lastSessionId: null,
    lastExpectedTotal: 0,
    timestamp: null,
  }
);
```

**Persistence Logic:**

1. **Auto-save on change:**
   ```typescript
   useEffect(() => {
     if (results.length > 0) {
       setPersistedState({
         results: results,
         lastSessionId: sessionId,
         lastExpectedTotal: expectedTotal,
         timestamp: Date.now(),
       });
     }
   }, [results, sessionId, expectedTotal]);
   ```

2. **Auto-restore on mount:**
   ```typescript
   useEffect(() => {
     if (persistedState.results.length > 0) {
       const isRecent = Date.now() - persistedState.timestamp < 24 * 60 * 60 * 1000;

       if (isRecent) {
         setResults(persistedState.results);
         notifications.show({
           title: "Data Restored",
           message: `Restored ${persistedState.results.length} previous results`,
         });
       }
     }
   }, []);
   ```

3. **Clear button:**
   ```typescript
   function handleClearResults() {
     setResults([]);
     clearState();
     notifications.show({ title: "Results Cleared" });
   }
   ```

**Storage Key:** `single_check_state`

**Expiry:** 24 hours (auto-ignore old data)

---

### 3. **BulkCheckPage Persistence**

#### File: [frontend/src/pages/BulkCheckPage.tsx](frontend/src/pages/BulkCheckPage.tsx)

**Already had localStorage**, but improved with notification:

```typescript
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const state = JSON.parse(saved);
    const hasResults = state.results && state.results.length > 0;

    setKeywords(state.keywords || "");
    setLocation(state.location || "vn");
    setDevice(state.device || "desktop");
    setResults(state.results || []);

    // NEW: Show restoration notification
    if (hasResults) {
      notifications.show({
        title: "Data Restored",
        message: `Restored ${state.results.length} previous results`,
        color: "blue",
        icon: <RotateCcw size={16} />,
        autoClose: 3000,
      });
    }
  }
}, []);
```

**Storage Key:** `bulk_check_state`

**Persisted Data:**
- `keywords` - Text input
- `location` - Selected location
- `device` - Desktop/Mobile
- `results` - Full results array

---

### 4. **Form Component Persistence**

#### File: [frontend/src/components/Form.tsx](frontend/src/components/Form.tsx)

**Changes:**
```typescript
// Before: Regular useState (lost on tab switch)
const [keywordsText, setKeywordsText] = useState("");
const [domainsText, setDomainsText] = useState("");
const [device, setDevice] = useState("desktop");
const [location, setLocation] = useState("vn");

// After: Persisted to localStorage
const [keywordsText, setKeywordsText] = useLocalStorage("form_inputs_keywords", "");
const [domainsText, setDomainsText] = useLocalStorage("form_inputs_domains", "");
const [device, setDevice] = useLocalStorage("form_inputs_device", "desktop");
const [location, setLocation] = useLocalStorage("form_inputs_location", "vn");
```

**Benefits:**
- User nhập keywords/domains → chuyển tab → quay lại → vẫn còn text
- Settings (location, device) được remember
- Template data vẫn có thể override persisted values

**Storage Keys:**
- `form_inputs_keywords`
- `form_inputs_domains`
- `form_inputs_device`
- `form_inputs_location`

---

## 🔄 User Flow Examples

### Scenario 1: Single Check với Tab Switching

1. User vào **Home** tab
2. Nhập 10 keywords + 10 domains
3. Click "Start" → SSE stream results (5/10 completed)
4. **Chuyển sang History tab** để xem lịch sử cũ
5. **Quay lại Home tab**
   - ✅ Form inputs vẫn còn (keywords/domains)
   - ✅ Results vẫn có 5 items
   - ✅ Hiện notification: "Data Restored - Restored 5 previous results"

### Scenario 2: Bulk Check với Browser Refresh

1. User vào **30 Ranking** tab
2. Nhập 5 keywords, chọn "Hà Nội", "Mobile"
3. Click check → results load (100+ domains)
4. **Close browser tab / Refresh page**
5. **Mở lại trang**
   - ✅ Keywords input vẫn có text
   - ✅ Location = "Hà Nội", Device = "Mobile"
   - ✅ Results table vẫn hiển thị đầy đủ
   - ✅ Notification: "Data Restored - Restored 5 previous results"

### Scenario 3: Form Input Persistence

1. User vào Home, bắt đầu nhập keywords (5 dòng)
2. **Chưa click Start**, chuyển qua Settings tab
3. Thay đổi API key
4. **Quay lại Home tab**
   - ✅ 5 keywords vẫn còn trong textarea
   - ✅ Không cần nhập lại

---

## 💾 LocalStorage Structure

### Single Check State
```json
{
  "single_check_state": {
    "results": [
      {
        "keyword": "seo tools",
        "domain": "moz.com",
        "position": 5,
        "url": "https://moz.com/...",
        "checked_at": "09/02/2026 22:45:30",
        "location_display": "Việt Nam"
      }
    ],
    "lastSessionId": "session_abc123_1234567890",
    "lastExpectedTotal": 10,
    "timestamp": 1707503130000
  }
}
```

### Bulk Check State
```json
{
  "bulk_check_state": {
    "keywords": "seo tools\nkeyword research",
    "location": "hanoi",
    "device": "mobile",
    "results": [
      {
        "keyword": "seo tools",
        "topDomains": [...]
      }
    ]
  }
}
```

### Form Inputs
```json
{
  "form_inputs_keywords": "seo tools\nbacklink checker",
  "form_inputs_domains": "moz.com\nahrefs.com",
  "form_inputs_device": "desktop",
  "form_inputs_location": "vn"
}
```

---

## 🎨 UI/UX Improvements

### 1. **Restoration Notification**

When data is restored, user sees a blue notification:

```
┌──────────────────────────────────┐
│ 🔄 Data Restored                 │
│ Restored 10 previous results     │
└──────────────────────────────────┘
```

**Specs:**
- Color: Blue (informational)
- Icon: RotateCcw (circular arrow)
- Auto-close: 3 seconds
- Position: Top-right

### 2. **Clear Results Button**

New trash icon button in SingleCheckPage header:

```tsx
<Tooltip label="Clear all results">
  <ActionIcon variant="subtle" color="gray" onClick={handleClearResults}>
    <Trash2 size={16} />
  </ActionIcon>
</Tooltip>
```

**Behavior:**
- Only shows when `results.length > 0` and `status !== "streaming"`
- Clears results + localStorage
- Shows gray notification: "Results Cleared"

---

## 🧪 Testing Checklist

### Manual Testing

**SingleCheckPage:**
- [x] Start check → chuyển tab → quay lại → results vẫn có
- [x] Nhập keywords → chuyển tab → quay lại → inputs vẫn có
- [x] Click Clear → results + localStorage bị xóa
- [x] Data > 24h cũ → không restore (expired)
- [x] Notification hiển thị khi restore

**BulkCheckPage:**
- [x] Check keywords → refresh browser → results vẫn có
- [x] Settings (location/device) → được persist
- [x] Notification hiển thị khi restore

**Form Component:**
- [x] Nhập text → chuyển tab → quay lại → text vẫn có
- [x] Template load → override persisted values
- [x] Location/device selection → persist

### Edge Cases

- [x] localStorage disabled (Safari private mode)
- [x] localStorage quota exceeded (5MB limit)
- [x] Corrupted JSON in localStorage
- [x] Multiple tabs open (shared localStorage)
- [x] Old schema + new code (handled by merge)

---

## 📊 Storage Size Estimation

**Typical usage:**

| Scenario | Items | Size | Total |
|----------|-------|------|-------|
| Form inputs | 4 keys | ~200 bytes each | 800 bytes |
| Single check results | 10 pairs | ~300 bytes each | 3 KB |
| Bulk check results | 5 keywords × 30 domains | ~200 bytes each | 30 KB |
| **Total** | - | - | **~34 KB** |

**Max capacity:** 5-10 MB (browser dependent)

**Safety margin:** Using <1% of available storage

---

## 🚀 Benefits Summary

### For Users
1. ✅ **No data loss** when switching tabs
2. ✅ **Resume work** after browser refresh
3. ✅ **Save time** - no need to re-enter data
4. ✅ **Better UX** - seamless navigation
5. ✅ **Transparency** - notification shows what was restored

### For Developers
1. ✅ **Reusable hooks** - `useLocalStorage`, `usePersistedState`
2. ✅ **Type-safe** - Full TypeScript support
3. ✅ **Easy to extend** - Just wrap state with hook
4. ✅ **Automatic** - No manual save/load logic
5. ✅ **Debuggable** - Inspect localStorage in DevTools

---

## 🔧 Maintenance Notes

### Adding Persistence to New Components

```typescript
// 1. Import the hook
import { useLocalStorage } from "@hooks/useLocalStorage";

// 2. Replace useState with useLocalStorage
const [myState, setMyState] = useLocalStorage("my_key", defaultValue);

// That's it! Auto-saves on every change.
```

### Clearing Old Data

Users can clear manually via:
1. Clear button (SingleCheckPage)
2. Browser DevTools → Application → Local Storage → Delete
3. Browser settings → Clear browsing data

Auto-expiry: 24 hours for SingleCheckPage results

### Migration Strategy

If schema changes, use object merge:
```typescript
const { state, setState } = usePersistedState("key", {
  // New fields with defaults
  newField: "default",
  ...
});
// Old localStorage data merges with new defaults
```

---

## 📝 Files Modified

### New Files
- [frontend/src/hooks/useLocalStorage.ts](frontend/src/hooks/useLocalStorage.ts) - Custom hooks

### Modified Files
- [frontend/src/pages/SingleCheckPage.tsx](frontend/src/pages/SingleCheckPage.tsx) - Added persistence + clear button
- [frontend/src/pages/BulkCheckPage.tsx](frontend/src/pages/BulkCheckPage.tsx) - Added notification
- [frontend/src/components/Form.tsx](frontend/src/components/Form.tsx) - Persist form inputs

### Documentation
- [PERSISTENCE_IMPLEMENTATION.md](PERSISTENCE_IMPLEMENTATION.md) - This file

---

## ✅ Success Criteria

All criteria met:

- ✅ Data persists across tab switches
- ✅ Data persists across page refreshes
- ✅ User notified when data is restored
- ✅ Clear functionality for old data
- ✅ Type-safe implementation
- ✅ Backward compatible (no breaking changes)
- ✅ Works in all major browsers
- ✅ Handles edge cases gracefully
- ✅ Documented for future maintenance

---

**Implementation Date:** 2026-02-09
**Version:** 2.0
**Status:** ✅ Completed
**Next Steps:** Monitor user feedback, consider SessionStorage for temporary data
