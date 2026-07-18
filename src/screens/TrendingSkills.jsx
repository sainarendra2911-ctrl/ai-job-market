import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend
);

export default function TrendingSkills() {
    const trendingSkills = [
        { skill: "Artificial Intelligence", jobs: 2845, growth: "+38%", color: "#6366F1" },
        { skill: "Python", jobs: 2612, growth: "+29%", color: "#3B82F6" },
        { skill: "React", jobs: 2384, growth: "+24%", color: "#06B6D4" },
        { skill: "AWS", jobs: 2145, growth: "+21%", color: "#10B981" },
        { skill: "Node.js", jobs: 1988, growth: "+19%", color: "#22C55E" },
        { skill: "TypeScript", jobs: 1825, growth: "+18%", color: "#2563EB" },
        { skill: "Docker", jobs: 1652, growth: "+16%", color: "#0EA5E9" },
        { skill: "Kubernetes", jobs: 1489, growth: "+15%", color: "#8B5CF6" },
        { skill: "Next.js", jobs: 1368, growth: "+14%", color: "#111827" },
        { skill: "Java", jobs: 1297, growth: "+12%", color: "#F97316" },
    ];

    const data = {
        labels: trendingSkills.map((item) => item.skill),
        datasets: [
            {
                label: "Open Jobs",
                data: trendingSkills.map((item) => item.jobs),
                backgroundColor: trendingSkills.map((item) => item.color),
                borderRadius: 8,
                borderSkipped: false,
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
            tooltip: {
                callbacks: {
                    label: (context) =>
                        `${context.raw.toLocaleString()} Open Jobs`,
                },
            },
        },

        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                },
            },

            y: {
                beginAtZero: true,
                grid: {
                    color: "#E5E7EB",
                },
            },
        },
    };

    return (
        <div className="bg-white  shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        🔥 Top Trending Skills
                    </h2>
                    <p className="text-sm text-gray-500">
                        Most in-demand technologies based on current job listings.
                    </p>
                </div>
            </div>

            <div className="h-80">
                <Bar data={data} options={options} />
            </div>

            <div className="mt-6 space-y-3">
                {trendingSkills.map((skill) => (
                    <div
                        key={skill.skill}
                        className="flex items-center justify-between border-b border-gray-100 pb-3"
                    >
                        <div>
                            <h4 className="font-medium text-gray-900">
                                {skill.skill}
                            </h4>
                            <p className="text-sm text-gray-500">
                                {skill.jobs.toLocaleString()} Open Jobs
                            </p>
                        </div>

                        <span className="font-semibold text-green-600">
                            ▲ {skill.growth}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}