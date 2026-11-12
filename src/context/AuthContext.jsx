import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCurrentUser } from "../services/api";

const AuthContext = createContext();

const TOKEN_STORAGE_KEY = "trabass_auth_token";
const USER_STORAGE_KEY = "trabass_auth_user";
const AUTH_EXPIRED_EVENT = "trabass:auth-expired";

// Sesi penyewa disimpan di localStorage agar tetap login setelah tab/browser
// ditutup — alur sewa harus bisa dilanjutkan/dikembalikan kapan saja.
// Sesi admin tetap di sessionStorage: perangkat dashboard bisa dipakai
// bergantian, sehingga sesi admin berakhir saat browser ditutup.
const resolveStorage = (role) =>
  role === "admin" ? sessionStorage : localStorage;

const readStoredToken = () =>
  localStorage.getItem(TOKEN_STORAGE_KEY) ||
  sessionStorage.getItem(TOKEN_STORAGE_KEY);

const readStoredUser = () => {
  const savedUser =
    localStorage.getItem(USER_STORAGE_KEY) ||
    sessionStorage.getItem(USER_STORAGE_KEY);

  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
};

/**
 * Menulis sesi ke storage sesuai role, sekaligus membersihkan storage lain
 * agar tidak ada sesi ganda yang tertinggal (mis. sesi admin lama).
 */
const persistSession = (nextToken, nextUser) => {
  const target = resolveStorage(nextUser?.role);
  const other = target === localStorage ? sessionStorage : localStorage;

  if (nextToken) target.setItem(TOKEN_STORAGE_KEY, nextToken);
  else target.removeItem(TOKEN_STORAGE_KEY);

  if (nextUser) target.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  else target.removeItem(USER_STORAGE_KEY);

  other.removeItem(TOKEN_STORAGE_KEY);
  other.removeItem(USER_STORAGE_KEY);
};

const clearSession = () => {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(readStoredUser);
  const [isInitializing, setIsInitializing] = useState(() =>
    Boolean(readStoredToken()),
  );

  const isAuthenticated = Boolean(token && user?.user_id);
  const isAdmin = Boolean(isAuthenticated && user?.role === "admin");

  // Sinkronkan sesi ke storage yang tepat. Efek ini sekaligus memindahkan
  // sesi admin lama (yang mungkin masih tersimpan di localStorage).
  useEffect(() => {
    if (token && user?.user_id) {
      persistSession(token, user);
    }
  }, [token, user]);

  // Validasi token tersimpan saat aplikasi dibuka. Jika token sudah
  // kedaluwarsa/tidak valid, sesi dibersihkan dan guard route akan
  // mengarahkan ke halaman login.
  useEffect(() => {
    const storedToken = readStoredToken();

    if (!storedToken) {
      setIsInitializing(false);
      return undefined;
    }

    let cancelled = false;

    getCurrentUser()
      .then((payload) => {
        if (cancelled) return;

        const freshUser = payload?.data?.user;
        if (freshUser) setUser(freshUser);
      })
      .catch((error) => {
        if (cancelled) return;

        // Hanya hapus sesi jika server menyatakan token tidak valid.
        // Gangguan jaringan tidak boleh memaksa pengguna logout.
        const status = error?.response?.status;

        if (status === 401 || status === 403 || status === 404) {
          clearSession();
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(({ token: nextToken, user: nextUser }) => {
    // Tulis sinkron agar request pertama setelah redirect login sudah
    // membawa Authorization header.
    persistSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  // Axios akan memicu event ini saat token kedaluwarsa / tidak valid.
  useEffect(() => {
    const handleExpired = () => logout();

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      isAdmin,
      isInitializing,
      login,
      logout,
    }),
    [token, user, isAuthenticated, isAdmin, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus digunakan di dalam <AuthProvider>");
  }

  return context;
};
