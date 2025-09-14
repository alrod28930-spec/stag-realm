import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface SimpleChartProps {
  data: Array<{ time: string; value: number }>;
  title: string;
  height?: number;
}

export const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  title,
  height = 200
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <XAxis dataKey="time" />
            <YAxis />
            <Line type="monotone" dataKey="value" stroke="rgb(59, 130, 246)" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};