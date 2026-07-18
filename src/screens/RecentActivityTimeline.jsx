import {
    Bookmark,
    Send,
    Briefcase,
    CheckCircle,
    XCircle,
    Upload,
    User,
} from "lucide-react";

const activities = [
    {
        id: 1,
        title: "Applied to Senior React Developer",
        company: "Google",
        time: "10 minutes ago",
        icon: Send,
        color: "bg-blue-100 text-blue-600",
    },
    {
        id: 2,
        title: "Saved Backend Developer",
        company: "Microsoft",
        time: "45 minutes ago",
        icon: Bookmark,
        color: "bg-yellow-100 text-yellow-600",
    },
    {
        id: 3,
        title: "Interview Scheduled",
        company: "Amazon",
        time: "Yesterday",
        icon: CheckCircle,
        color: "bg-green-100 text-green-600",
    },
    {
        id: 4,
        title: "Application Rejected",
        company: "Meta",
        time: "2 days ago",
        icon: XCircle,
        color: "bg-red-100 text-red-600",
    },
    {
        id: 5,
        title: "Resume Updated",
        company: "",
        time: "3 days ago",
        icon: Upload,
        color: "bg-purple-100 text-purple-600",
    },
    {
        id: 6,
        title: "Profile Completed",
        company: "",
        time: "Last Week",
        icon: User,
        color: "bg-indigo-100 text-indigo-600",
    },
];

export default function RecentActivityTimeline() {
    return (
        <div className="bg-white  border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Recent Activity
                    </h2>
                    <p className="text-sm text-slate-500">
                        Your latest job search activities.
                    </p>
                </div>

                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All
                </button>
            </div>

            <div className="space-y-6">
                {activities.map((activity, index) => {
                    const Icon = activity.icon;

                    return (
                        <div key={activity.id} className="relative flex gap-4">
                            {index !== activities.length - 1 && (
                                <div className="absolute left-5 top-10 w-0.5 h-full bg-slate-200" />
                            )}

                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}
                            >
                                <Icon size={18} />
                            </div>

                            <div className="flex-1">
                                <h4 className="font-medium text-slate-900">
                                    {activity.title}
                                </h4>

                                {activity.company && (
                                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                        <Briefcase size={14} />
                                        {activity.company}
                                    </p>
                                )}

                                <p className="text-xs text-slate-400 mt-1">
                                    {activity.time}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}