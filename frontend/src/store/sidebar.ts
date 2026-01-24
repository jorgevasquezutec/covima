import { create } from 'zustand';

interface SidebarState {
    collapsed: boolean;
    mobileOpen: boolean;
    setCollapsed: (collapsed: boolean) => void;
    toggleCollapsed: () => void;
    setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
    collapsed: false,
    mobileOpen: false,
    setCollapsed: (collapsed) => set({ collapsed }),
    toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
    setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}));
