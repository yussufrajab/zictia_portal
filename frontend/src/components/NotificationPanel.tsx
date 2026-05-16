import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/lib/api";
import { Check, CheckCheck, Bell, Loader } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  status: "PENDING" | "SENT" | "READ";
  type: string;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery(
    "my-notifications",
    () => api.get("/notifications?page=1&limit=20").then((r) => r.data.data as Notification[]),
    { enabled: isOpen, refetchInterval: isOpen ? 30000 : false }
  );

  const markReadMutation = useMutation(
    (id: string) => api.put(`/notifications/${id}/read`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("my-notifications");
        queryClient.invalidateQueries("notification-unread-count");
      },
    }
  );

  const markAllMutation = useMutation(
    () => api.put("/notifications/mark-all-read"),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("my-notifications");
        queryClient.invalidateQueries("notification-unread-count");
      },
    }
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const notifications = data || [];
  const unread = notifications.filter((n) => n.status !== "READ");

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unread.length > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isLoading}
            className="text-xs text-zictia-blue hover:text-blue-700 flex items-center gap-1"
          >
            {markAllMutation.isLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCheck className="w-3 h-3" />
            )}
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                n.status === "READ" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {n.status !== "READ" && (
                  <button
                    onClick={() => markReadMutation.mutate(n.id)}
                    className="p-1 text-zictia-blue hover:bg-blue-50 rounded"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
