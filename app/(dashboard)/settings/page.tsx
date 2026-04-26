import { SettingsForm } from '@/components/forms/settings-form';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { requireRole } from '@/lib/auth/session';
import { getSettings } from '@/lib/services/settings';

export default async function SettingsPage() {
    await requireRole(['ADMIN']);
    const settings = await getSettings();

    return (
        <div className="space-y-2">
            <PageHeader
                title="Settings"
                description="Configure shop identity, receipt text, and currency preferences."
            />
            <Card>
                <CardContent className="py-6 px-8">
                    <SettingsForm settings={settings} />
                </CardContent>
            </Card>
        </div>
    );
}
