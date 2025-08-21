import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "appEnabled:v1";

type Setter = boolean | ((prev: boolean) => boolean);

type Ctx = {
  enabled: boolean;
  setEnabled: (v: Setter) => void; // functional setter allowed
  toggle: () => void;
  hydrated: boolean;
};

const AppEnabledContext = createContext<Ctx | undefined>(undefined);

export const AppEnabledProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [enabled, setEnabledState] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw === "1") setEnabledState(true);
        else if (raw === "0") setEnabledState(false);
        // else leave default (true)
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setEnabled = useCallback((updater: Setter) => {
    setEnabledState((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: boolean) => boolean)(prev)
          : updater;
      AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0").catch(() => {});
      return next;
    });
  }, []);

  const toggle = useCallback(() => setEnabled((p) => !p), [setEnabled]);

  const value = useMemo<Ctx>(
    () => ({ enabled, setEnabled, toggle, hydrated }),
    [enabled, hydrated, setEnabled, toggle]
  );

  return (
    <AppEnabledContext.Provider value={value}>
      {children}
    </AppEnabledContext.Provider>
  );
};

export const useAppEnabled = () => {
  const ctx = useContext(AppEnabledContext);
  if (!ctx)
    throw new Error("useAppEnabled must be used inside AppEnabledProvider");
  return ctx;
};
