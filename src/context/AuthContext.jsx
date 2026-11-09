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

// Sesi autentikasi memakai sessionStorage: token hilang otomatis ketika
// browser/tab ditutup, sehingga pengguna harus login kembali.
const readStoredToken = () => sessionStorage.getItem(TOKEN_STORAGE_KEY);

const readStoredUser = () => {
  const savedUser = sessionStorage.getItem(USER_STORAGE_KEY);
  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(readStoredUser);
  const [isInitializing, setIsInitializing] = useState(() =>
    Boolean(readStoredToken()),
  );

  const isAuthenticated = Boolean(token && user?.user_id);
  const isAdmin = Boolean(isAuthenticated && user?.role === "admin");

  // Bersihkan token lama dari localStorage (versi sebelumnya) agar tidak
  // membuat sesi "hantu" yang bertahan setelah browser ditutup.
  useEffect(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  // Sinkronkan token ke sessionStorage.
  useEffect(() => {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  // Sinkronkan data user ke sessionStorage.
  useEffect(() => {
    if (user) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

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
    if (nextToken) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    }

    if (nextUser) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    }

    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);

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
