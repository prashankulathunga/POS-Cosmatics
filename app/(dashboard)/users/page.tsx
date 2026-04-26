import { Plus, UserMinus } from 'lucide-react';

import { UserFormDialog } from '@/components/forms/user-form-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { deactivateUserAction } from '@/lib/actions/user-actions';
import { requireRole } from '@/lib/auth/session';
import { listUsers } from '@/lib/services/users';
import { formatDateTime } from '@/lib/utils';

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; page?: string }>;
}) {
    await requireRole(['ADMIN']);
    const params = await searchParams;
    const data = await listUsers(Number(params.page ?? '1'), params.query);

    return (
        <div className="space-y-2">
            <PageHeader
                title="Users"
                description="Create separate admin and cashier accounts and deactivate access when needed."
                actions={
                    <UserFormDialog
                        trigger={
                            <Button>
                                <Plus className="h-4 w-4" />
                                Add user
                            </Button>
                        }
                    />
                }
            />

            <Card>
                <CardContent className="space-y-4 p-6">
                    <form>
                        <Input
                            name="query"
                            placeholder="Search by full name or username"
                            defaultValue={params.query}
                        />
                    </form>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last login</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{user.fullName}</p>
                                            <p className="text-xs text-slate-500">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.lastLoginAt
                                            ? formatDateTime(user.lastLoginAt)
                                            : 'Never'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <UserFormDialog
                                                user={user}
                                                trigger={<Button variant="outline">Edit</Button>}
                                            />
                                            {user.isActive ? (
                                                <form
                                                    action={async () => {
                                                        'use server';
                                                        await deactivateUserAction(user.id);
                                                    }}
                                                >
                                                    <Button variant="ghost" size="icon">
                                                        <UserMinus className="h-4 w-4" />
                                                    </Button>
                                                </form>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
