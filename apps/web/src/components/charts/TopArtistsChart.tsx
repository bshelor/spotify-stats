'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Datum = {
  name: string;
  popularity: number;
};

export function TopArtistsChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#23272b" />
        <XAxis type="number" domain={[0, 100]} stroke="#8a9199" />
        <YAxis type="category" dataKey="name" width={140} stroke="#8a9199" />
        <Tooltip
          contentStyle={{
            background: '#141719',
            border: '1px solid #23272b',
            color: '#e8eaed',
          }}
          cursor={{ fill: 'rgba(29, 185, 84, 0.08)' }}
        />
        <Bar dataKey="popularity" fill="#1db954" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
