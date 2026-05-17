import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Users, Plus, Trash2, ArrowLeft, Loader, Mail, Phone, Shield } from "lucide-react";

const roles = [
  { value: "ACCOUNT_ADMIN", label: "Account Admin", icon: Shield },
  { value: "TECHNICAL_USER", label: "Technical User", icon: Shield },
  { value: "BILLING_USER", label: "Billing User", icon: Shield },
  { value: "READ_ONLY", label: "Read Only", icon: Shield },
];

export default function SubUsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    role: "READ_ONLY" as string,
  });

  const { data, isLoading } = useQuery("sub-users", () =>
    api.get("/auth/sub-users").then((r) => r.data.data)
  );

  const createMutation = useMutation(
    () => api.post("/auth/sub-users", form),
    {
      onSuccess: () => {
        toast.success("Sub-user invited successfully");
        setShowForm(false);
        setForm({ fullName: "", email: "", mobile: "", role: "READ_ONLY" });
        queryClient.invalidateQueries("sub-users");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed to invite user"); },
    }
  );

  const removeMutation = useMutation(
    (id: string) => api.delete(`/auth/sub-users/${id}`),
    {
      onSuccess: () => {
        toast.success("User removed");
        queryClient.invalidateQueries("sub-users");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed to remove user"); },
    }
  );

  const users = data || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-zictia-navy">Sub-User Management</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-zictia-blue" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Team Members</p>
              <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? "s" : ""} in your account</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zictia-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Invite User
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
        >
          <h2 className="font-semibold text-gray-900 mb-4">Invite New User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  required
                  placeholder="+255xxxxxxxxx"
                  value={form.mobile}
                  onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="px-4 py-2 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isLoading && <Loader className="w-4 h-4 animate-spin" />}
              Send Invite
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm({ fullName: "", email: "", mobile: "", role: "READ_ONLY" }); }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No sub-users yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u: any) => {
              const roleLabel = roles.find((r) => r.value === u.role)?.label || u.role;
              return (
                <div key={u.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                      {u.fullName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.fullName}</p>
                      <p className="text-xs text-gray-500">{u.email} • {u.mobile}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm("Remove this user?")) removeMutation.mutate(u.id); }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
