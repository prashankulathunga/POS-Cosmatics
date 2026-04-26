'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from '@/lib/actions/auth-actions';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';

export function LoginForm() {
    const [isPending, startTransition] = useTransition();
    const form = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    });

    const onSubmit = form.handleSubmit((values) => {
        startTransition(async () => {
            const result = await loginAction(values);

            if (result?.error) {
                toast.error(result.error);
            }
        });
    });

    return (
        <Card className="border-white/70 bg-white/90 backdrop-blur">
            <CardHeader className="space-y-2">
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-600">
                    Secure Access
                </p>
                <CardTitle className="text-3xl">POS Beauty</CardTitle>
                <CardDescription>Log in as an admin or cashier to continue.</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-5" onSubmit={onSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            autoComplete="username"
                            {...form.register('username')}
                        />
                        {form.formState.errors.username ? (
                            <p className="text-sm text-rose-600">
                                {form.formState.errors.username.message}
                            </p>
                        ) : null}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            {...form.register('password')}
                        />
                        {form.formState.errors.password ? (
                            <p className="text-sm text-rose-600">
                                {form.formState.errors.password.message}
                            </p>
                        ) : null}
                    </div>
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Signing in...' : 'Sign in'}
                    </Button>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">Seed credentials</p>
                        <p>`admin / admin123`</p>
                        <p>`cashier / cashier123`</p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
