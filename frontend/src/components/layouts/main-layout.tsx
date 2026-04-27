import { Outlet } from 'react-router-dom';

import MainSidebar from '@/components/layouts/main-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

const MainLayout = () => {
    return (
        <SidebarProvider>
            <MainSidebar />
            <SidebarInset className="bg-transparent">
                <Outlet />
            </SidebarInset>
        </SidebarProvider>
    );
};

export default MainLayout;
