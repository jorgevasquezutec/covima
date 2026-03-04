import { create } from 'zustand';

interface SidebarState {
    collapsed: boolean;
    mobileOpen: boolean;
    fabHidden: boolean;
    setCollapsed: (collapsed: boolean) => void;
    toggleCollapsed: () => void;
    setMobileOpen: (open: boolean) => void;
    toggleFab: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
    collapsed: false,
    mobileOpen: false,
    fabHidden: JSON.parse(localStorage.getItem('fabHidden') || 'false'),
    setCollapsed: (collapsed) => set({ collapsed }),
    toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
    setMobileOpen: (mobileOpen) => set({ mobileOpen }),
    toggleFab: () => set((state) => {
        const next = !state.fabHidden;
        localStorage.setItem('fabHidden', JSON.stringify(next));
        return { fabHidden: next };
    }),
}));
