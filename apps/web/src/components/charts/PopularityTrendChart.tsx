'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Datum = {
  capturedAt: string;
  popularity: number;
  rank: number;
};

export function PopularityTrendChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#23272b" />
        <XAxis dataKey="capturedAt" stroke="#8a9199" />
        <YAxis yAxisId="pop" domain={[0, 100]} stroke="#1db954" />
        <YAxis yAxisId="rank" orientation="right" reversed stroke="#8a9199" />
        <Tooltip
          contentStyle={{
            background: '#141719',
            border: '1px solid #23272b',
            color: '#e8eaed',
          }}
        />
        <Line
          yAxisId="pop"
          type="monotone"
          dataKey="popularity"
          stroke="#1db954"
          strokeWidth={2}
          dot
        />
        <Line
          yAxisId="rank"
          type="monotone"
          dataKey="rank"
          stroke="#8a9199"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
