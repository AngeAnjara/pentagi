import { Loader2 } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';

import Logo from '@/components/icons/logo';
import LoginForm from '@/features/authentication/login-form';
import { getSafeReturnUrl } from '@/lib/utils/auth';
import { useUser } from '@/providers/user-provider';

const Login = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { authInfo, isLoading } = useUser();
    const authProviders = authInfo?.providers || [];

    // Extract the return URL from either location state or query parameters
    const returnUrl = getSafeReturnUrl(
        (location.state?.from as string) || searchParams.get('returnUrl'),
        '/flows/new',
    );

    return (
        <div className="flex h-dvh w-full items-center justify-center bg-transparent">
            <div className="h-dvh w-full lg:grid lg:grid-cols-2">
                <div className="flex items-center justify-center px-6 py-12">
                    {!isLoading ? (
                        <LoginForm
                            providers={authProviders}
                            returnUrl={returnUrl}
                        />
                    ) : (
                        <Loader2 className="size-16 animate-spin" />
                    )}
                </div>
                <div className="hidden overflow-hidden border-l border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,1))] lg:flex">
                    <div className="m-auto flex max-w-lg flex-col items-center gap-8 px-10 text-center">
                        <div className="bg-primary/15 ring-primary/20 flex size-28 items-center justify-center rounded-[2rem] ring-1">
                            <Logo className="animate-logo-spin text-foreground size-20 delay-10000" />
                        </div>
                        <div className="space-y-3">
                            <div className="text-primary text-xs font-medium uppercase tracking-[0.28em]">
                                Santatra App
                            </div>
                            <h1 className="text-4xl font-semibold tracking-tight text-slate-50">
                                Secure workflows, monitoring and operations in one workspace
                            </h1>
                            <p className="text-base leading-7 text-slate-400">
                                Connect to your flows, integrated uptime console and system controls from a single authenticated shell.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
