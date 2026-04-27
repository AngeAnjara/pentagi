import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import type { OAuthProvider } from '@/providers/user-provider';

import Github from '@/components/icons/github';
import Google from '@/components/icons/google';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser } from '@/providers/user-provider';

import { PasswordChangeForm } from './password-change-form';

const formSchema = z.object({
    mail: z
        .string()
        .min(1, {
            message: 'Le login est requis',
        })
        .refine(
            (value) => z.string().email().safeParse(value).success || ['admin', 'demo'].includes(value.toLowerCase()),
            {
                message: 'Login invalide',
            },
        ),
    password: z.string().min(1, {
        message: 'Le mot de passe est requis',
    }),
});

const errorMessage = 'Login ou mot de passe invalide';
const errorProviderMessage = "Echec de l'authentification";

interface AuthProviderAction {
    icon: React.ReactNode;
    id: OAuthProvider;
    name: string;
}

const providerActions: AuthProviderAction[] = [
    {
        icon: <Google className="size-5" />,
        id: 'google',
        name: 'Continuer avec Google',
    },
    {
        icon: <Github className="size-5" />,
        id: 'github',
        name: 'Continuer avec GitHub',
    },
];

interface LoginFormProps {
    providers: string[]; // OAuth providers: ['google', 'github']
    returnUrl?: string;
}

const LoginForm = ({ providers, returnUrl = '/flows/new' }: LoginFormProps) => {
    const form = useForm<z.infer<typeof formSchema>>({
        defaultValues: {
            mail: '',
            password: '',
        },
        resolver: zodResolver(formSchema),
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
    const navigate = useNavigate();
    const { authInfo, isAuthenticated, login, loginWithOAuth, setAuth } = useUser();

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await login(values);

            if (!result.success) {
                setError(result.error || errorMessage);

                return;
            }

            if (result.passwordChangeRequired) {
                setPasswordChangeRequired(true);

                return;
            }

            navigate(returnUrl);
        } catch {
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProviderLogin = async (provider: OAuthProvider) => {
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await loginWithOAuth(provider);

            if (!result.success) {
                setError(result.error || errorProviderMessage);

                return;
            }

            navigate(returnUrl);
        } catch (error) {
            setError(error instanceof Error ? error.message : errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkipPasswordChange = () => {
        navigate(returnUrl);
    };

    const handlePasswordChangeSuccess = () => {
        if (authInfo?.user) {
            // Update auth info with password_change_required set to false
            const updatedAuthData = {
                ...authInfo,
                user: {
                    ...authInfo.user,
                    password_change_required: false,
                },
            };

            setAuth(updatedAuthData);
            navigate(returnUrl);
        }
    };

    // If password change is required, show password change form.
    // Also check isAuthenticated() to ensure the user has a valid session.
    // If the session expired and user refreshed the page, the old authInfo may still
    // be in memory (race condition between clearAuth() and navigate()), but we must
    // NOT show the password change form because:
    //   1. The API endpoint /user/password requires authentication (returns 403 if not)
    //   2. The user must first re-login to establish a new valid session
    // Also check authInfo directly to handle page refresh scenarios where passwordChangeRequired
    // local state is lost but authInfo.user.password_change_required is still true.
    const shouldShowPasswordChange =
        (passwordChangeRequired || authInfo?.user?.password_change_required) &&
        authInfo?.user?.type === 'local' &&
        isAuthenticated();

    if (shouldShowPasswordChange) {
        return (
            <div className="panel-shell mx-auto flex w-full max-w-[28rem] flex-col gap-6 p-8">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Mettre a jour le mot de passe</h1>
                    <p className="text-center text-sm leading-6 text-slate-400">
                    Vous devez changer votre mot de passe avant de continuer.
                    </p>
                </div>
                <PasswordChangeForm
                    isModal={false}
                    onSkip={handleSkipPasswordChange}
                    onSuccess={handlePasswordChangeSuccess}
                    showSkip={true}
                />
            </div>
        );
    }

    return (
        <Form {...form}>
            <form
                className="panel-shell mx-auto grid w-full max-w-[28rem] gap-8 p-8"
                onSubmit={form.handleSubmit(handleSubmit)}
            >
                <div className="space-y-3 text-center">
                    <div className="text-primary text-xs font-medium uppercase tracking-[0.28em]">Santatra App</div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Connexion</h1>
                    <p className="text-sm leading-6 text-slate-400">
                        Accedez aux flows, a la supervision et aux outils integres depuis un seul espace securise.
                    </p>
                </div>

                {providers?.length > 0 && (
                    <>
                        <div className="flex flex-col gap-4">
                            {providerActions
                                .filter((provider) => providers.includes(provider.id))
                                .map((provider) => (
                                    <Button
                                        className="border-slate-800 bg-slate-900/80 text-slate-100 hover:bg-slate-800"
                                        disabled={isSubmitting}
                                        key={provider.id}
                                        onClick={() => handleProviderLogin(provider.id)}
                                        type="button"
                                        variant="outline"
                                    >
                                        {provider.icon}
                                        {provider.name}
                                    </Button>
                                ))}
                        </div>

                        <div className="relative -mb-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-800" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-slate-950 px-2 text-slate-500">ou</span>
                            </div>
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-4">
                    <FormField
                        control={form.control}
                        name="mail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Identifiant</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        autoFocus
                                        className="border-slate-800 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
                                        placeholder="Entrez votre email"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mot de passe</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        className="border-slate-800 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
                                        placeholder="Entrez votre mot de passe"
                                        type="password"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        className="w-full"
                        disabled={isSubmitting || (!form.formState.isValid && form.formState.isSubmitted)}
                        type="submit"
                    >
                        {isSubmitting && <Loader2 className="animate-spin" />}
                        <span>Se connecter</span>
                    </Button>

                    {error && <FormMessage className="text-center">{error}</FormMessage>}
                </div>
            </form>
        </Form>
    );
};

export default LoginForm;
