'use client';

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

export function SalesChart({
    data,
    currencyCode,
}: {
    data: { label: string; sales: number; returns: number }[];
    currencyCode: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="5%" stopColor="#f8b8bb" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f8b8bb" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="returnsGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#e2e8f064" />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={18}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatCurrency(value, currencyCode)}
                            width={90}
                        />
                        <Tooltip
                            formatter={(value) => formatCurrency(Number(value ?? 0), currencyCode)}
                            contentStyle={{
                                borderRadius: 16,
                                borderColor: '#e2e8f0',
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="#f8b8bb"
                            fill="url(#salesGradient)"
                            strokeWidth={2.5}
                        />
                        <Area
                            type="monotone"
                            dataKey="returns"
                            stroke="#f8b8bb"
                            fill="url(#returnsGradient)"
                            strokeWidth={3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
