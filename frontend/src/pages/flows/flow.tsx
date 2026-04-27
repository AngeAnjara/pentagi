import { ChevronDown, Copy, Download, ExternalLink, GripVertical, Loader2, NotepadText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { FlowStatusIcon } from '@/components/icons/flow-status-icon';
import { ProviderIcon } from '@/components/icons/provider-icon';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import FlowCentralTabs from '@/features/flows/flow-central-tabs';
import FlowTabs from '@/features/flows/flow-tabs';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Log } from '@/lib/log';
import { copyToClipboard, downloadTextFile, generateFileName, generateReport } from '@/lib/report';
import { formatName } from '@/lib/utils/format';
import { useFlow } from '@/providers/flow-provider';

const FlowReportDropdown = () => {
    const { flowData, flowId } = useFlow();
    const flow = flowData?.flow;
    const tasks = flowData?.tasks ?? [];

    // Check if flow is available for report generation
    const isReportDisabled = !flow || !flowId;

    // Report export handlers
    const handleCopyToClipboard = async () => {
        if (isReportDisabled) {
            return;
        }

        const reportContent = generateReport(tasks, flow);
        const success = await copyToClipboard(reportContent);

        if (success) {
            toast.success('Report copied to clipboard');
        } else {
            Log.error('Failed to copy report to clipboard');
            toast.error('Failed to copy report to clipboard');
        }
    };

    const handleDownloadMD = () => {
        if (isReportDisabled || !flow) {
            return;
        }

        try {
            // Generate report content
            const reportContent = generateReport(tasks, flow);

            // Generate file name
            const baseFileName = generateFileName(flow);
            const fileName = `${baseFileName}.md`;

            // Download file
            downloadTextFile(reportContent, fileName, 'text/markdown; charset=UTF-8');
        } catch (error) {
            Log.error('Failed to download markdown report:', error);
        }
    };

    const handleDownloadPDF = () => {
        if (isReportDisabled || !flow || !flowId) {
            return;
        }

        // Open new tab (not popup) with report page and download flag
        const url = `/flows/${flowId}/report?download=true&silent=true`;
        window.open(url, '_blank');
    };

    const handleOpenWebView = () => {
        if (isReportDisabled || !flowId) {
            return;
        }

        // Open new tab with report page for web viewing
        const url = `/flows/${flowId}/report`;
        window.open(url, '_blank');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="shrink-0 text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    disabled={isReportDisabled}
                    variant="ghost"
                >
                    <NotepadText />
                    Report
                    <ChevronDown className="opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleOpenWebView}
                >
                    <ExternalLink className="size-4" />
                    Open web view
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleCopyToClipboard}
                >
                    <Copy className="size-4" />
                    Copy to clipboard
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleDownloadMD}
                >
                    <Download className="size-4" />
                    Download MD
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleDownloadPDF}
                >
                    <Download className="size-4" />
                    Download PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const Flow = () => {
    const { isDesktop } = useBreakpoint();
    const navigate = useNavigate();

    // Get flow data from FlowProvider
    const { flowData, flowError, isLoading: isFlowLoading } = useFlow();

    // Redirect to flows list if there's an error loading flow data or flow not found
    useEffect(() => {
        if (flowError || (!isFlowLoading && !flowData?.flow)) {
            navigate('/flows', { replace: true });
        }
    }, [flowError, flowData, isFlowLoading, navigate]);

    // State for preserving active tabs when switching flows
    const [activeTabsTab, setActiveTabsTab] = useState<string>(!isDesktop ? 'automation' : 'terminal');

    const tabsCard = (
        <div className="panel-shell flex h-full max-w-full flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-4 pr-2">
                <FlowTabs
                    activeTab={activeTabsTab}
                    onTabChange={setActiveTabsTab}
                />
            </div>
        </div>
    );

    return (
        <>
            <header className="sticky top-0 z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-16">
                <div className="flex w-full items-center justify-between gap-2 px-5">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            className="mr-2 h-5"
                            orientation="vertical"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="gap-2">
                                    {flowData?.flow && (
                                        <>
                                            <FlowStatusIcon
                                                status={flowData.flow.status}
                                                tooltip={formatName(flowData.flow.status)}
                                            />

                                            <ProviderIcon
                                                provider={flowData.flow.provider}
                                                tooltip={formatName(flowData.flow.provider.name)}
                                            />
                                        </>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">
                                            Flow
                                        </span>
                                        <BreadcrumbPage className="max-w-[38vw] truncate text-base font-semibold tracking-tight">
                                            {flowData?.flow?.title || 'Select a flow'}
                                        </BreadcrumbPage>
                                    </div>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    {!!(flowData?.tasks ?? [])?.length && <FlowReportDropdown />}
                </div>
            </header>
            <div className="relative flex h-[calc(100dvh-4rem)] w-full max-w-full flex-1 gap-4 bg-slate-950/25 p-4">
                {isFlowLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                        <Loader2 className="size-16 animate-spin" />
                    </div>
                )}
                {isDesktop ? (
                    <ResizablePanelGroup
                        className="w-full"
                        direction="horizontal"
                    >
                        <ResizablePanel
                            defaultSize={50}
                            minSize={30}
                        >
                            <div className="panel-shell flex h-full max-w-full flex-col overflow-hidden">
                                <div className="flex-1 overflow-auto p-4 pr-2">
                                    <FlowCentralTabs />
                                </div>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle>
                            <GripVertical className="size-4" />
                        </ResizableHandle>
                        <ResizablePanel
                            defaultSize={50}
                            minSize={30}
                        >
                            {tabsCard}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                ) : (
                    tabsCard
                )}
            </div>
        </>
    );
};

export default Flow;
