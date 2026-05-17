import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, CheckCircle, XCircle, ArrowRight, Users } from "lucide-react";

export default function AdminAccounts() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data } = useQuery(
    ["admin-accounts", statusFilter, search],
    () => api.get("/admin/accounts", { params: { status: statusFilter, search } }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const approveMutation = useMutation(
    ({ id, status, reason }: any) => api.post(`/admin/accounts/${id}/approve`, { status, reason }),
    {
      onSuccess: () => {
        toast.success("Account updated");
        queryClient.invalidateQueries("admin-accounts");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed"); },
    }
  );

  const accounts = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">Customer Accounts</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${!statusFilter ? "bg-zictia-blue text-white" : "bg-white border text-gray-700"}`}
          >All</button>
          <button
            onClick={() => setStatusFilter("PENDING_APPROVAL")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${statusFilter === "PENDING_APPROVAL" ? "bg-zictia-blue text-white" : "bg-white border text-gray-700"}`}
          >Pending</button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${statusFilter === "ACTIVE" ? "bg-zictia-blue text-white" : "bg-white border text-gray-700"}`}
          >Active</button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {accounts.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.organisationName || "Individual"}</p>
                  <p className="text-xs text-gray-500">{a.accountType} &bull; {a.status} &bull; {a.users?.[0]?.email || ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {a.status === "PENDING_APPROVAL" && (
                  <>
                    <button
                      onClick={() => approveMutation.mutate({ id: a.id, status: "ACTIVE", reason: "Approved by admin" })}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      title="Approve"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => approveMutation.mutate({ id: a.id, status: "SUSPENDED", reason: "Rejected by admin" })}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </>
                )}
                <Link
                  to={`/admin/accounts`}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
          {accounts.length === 0 && <p className="p-6 text-center text-gray-500">No accounts found.</p>}
        </div>
      </div>
    </div>
  );
}
