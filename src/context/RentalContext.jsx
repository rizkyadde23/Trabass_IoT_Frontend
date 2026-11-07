import React, { createContext, useContext, useState, useEffect } from "react";

const RentalContext = createContext();

const LOCAL_STORAGE_KEY = "trabass_active_rental";
const USER_STORAGE_KEY = "trabass_user_data";

export const RentalProvider = ({ children }) => {
  // Mock Data User (Nanti disinkronkan dengan Auth Module)
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    return savedUser
      ? JSON.parse(savedUser)
      : {
          user_id: 1,
          name: "Rizky Adde",
          phone_number: "081234567890",
        };
  });

  // State Sesi Sewa Aktif
  const [activeRental, setActiveRental] = useState(() => {
    const savedRental = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedRental ? JSON.parse(savedRental) : null;
  });

  // Simpan ke localStorage setiap kali activeRental diperbarui
  useEffect(() => {
    if (activeRental) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeRental));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [activeRental]);

  // Simpan User Data
  useEffect(() => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }, [user]);

  /**
   * Memulai Sesi Sewa Baru
   */
  const startRentalSession = (rentalData) => {
    const newSession = {
      order_id: rentalData.order_id,
      bike_id: rentalData.bike_id,
      duration_minutes: rentalData.duration_minutes,
      start_time: new Date().toISOString(),
      end_time: new Date(
        Date.now() + rentalData.duration_minutes * 60000,
      ).toISOString(),
      rental_status: "ACTIVE",
    };
    setActiveRental(newSession);
  };

  /**
   * Memperbarui Sesi Sewa (Misal saat Extend Waktu)
   */
  const updateRentalSession = (addedMinutes) => {
    if (!activeRental) return;

    const currentEndTime = new Date(activeRental.end_time);
    const now = new Date();
    const baseTime = currentEndTime > now ? currentEndTime : now;
    const newEndTime = new Date(baseTime.getTime() + addedMinutes * 60000);

    setActiveRental((prev) => ({
      ...prev,
      duration_minutes: prev.duration_minutes + addedMinutes,
      end_time: newEndTime.toISOString(),
      rental_status: "ACTIVE",
    }));
  };

  /**
   * Mengakhiri / Selesai Sesi Sewa
   */
  const clearRentalSession = () => {
    setActiveRental(null);
  };

  return (
    <RentalContext.Provider
      value={{
        user,
        setUser,
        activeRental,
        startRentalSession,
        updateRentalSession,
        clearRentalSession,
      }}
    >
      {children}
    </RentalContext.Provider>
  );
};

export const useRental = () => {
  const context = useContext(RentalContext);
  if (!context) {
    throw new Error("useRental harus digunakan di dalam <RentalProvider>");
  }
  return context;
};
