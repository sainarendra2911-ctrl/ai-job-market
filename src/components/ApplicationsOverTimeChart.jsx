import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const data = {
    labels: ["Jul 1", "Jul 2", "Jul 3", "Jul 4", "Jul 5", "Jul 6", "Jul 7"],
    datasets: [
        {
            label: "Applications",
            data: [2, 4, 3, 6, 5, 8, 10],
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59,130,246,0.15)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#3B82F6",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
        },
    ],
};

const options = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
        legend: {
            display: false,
        },

        title: {
            display: false,
        },

        tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: "#1e293b",
            titleColor: "#fff",
            bodyColor: "#fff",
            padding: 12,
            borderColor: "#334155",
            borderWidth: 1,
        },
    },

    interaction: {
        mode: "nearest",
        intersect: false,
    },

    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                color: "#64748B",
            },
        },

        y: {
            beginAtZero: true,
            ticks: {
                stepSize: 2,
                color: "#64748B",
            },
            grid: {
                color: "#E2E8F0",
            },
        },
    },
};

export default function ApplicationsOverTimeChart() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Applications Over Time
                    </h2>
                    <p className="text-sm text-slate-500">
                        Track your daily job applications.
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">38</p>
                    <span className="text-xs text-green-600">
                        ↑ 18% vs last week
                    </span>
                </div>
            </div>

            <div className="h-80">
                <Line data={data} options={options} />
            </div>
        </div>
    );
}