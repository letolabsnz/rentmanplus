import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../components/ToastProvider";
import { useConfirm } from "../components/ConfirmProvider";
import { useAuthRecord } from "../lib/pocketbase";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-neutral-800 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}

export default function UserDetail() {
  const { id = "" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const me = useAuthRecord();

  const { data: users } = useQuery({ queryKey: ["users"], queryFn: api.listUsers, enabled: !isNew });
  const user = users?.find((u) => u.id === id);
  const isSelf = !!(user && me && user.id === me.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setIsAdmin(user.isAdmin);
    }
  }, [user]);

  const { data: activity } = useQuery({
    queryKey: ["user-activity", id],
    queryFn: () => api.getUserActivity(id),
    enabled: !isNew,
  });
  const stats = activity?.stats ?? { prints: 0, logins: 0, pageViews: 0 };
  const recentLogs = activity?.recent ?? [];

  async function save() {
    setSaving(true);
    try {
      if (isNew) {
        if (!password.trim()) {
          showToast("error", "Set a password for the new account");
          return;
        }
        const created = await api.createUser({ name, email, password, isAdmin });
        await queryClient.invalidateQueries({ queryKey: ["users"] });
        showToast("success", "User created");
        navigate(`/users/${created.id}`, { replace: true });
      } else {
        const data: Partial<{ name: string; email: string; isAdmin: boolean; password: string }> = {
          name,
          email,
          isAdmin,
        };
        if (password.trim()) data.password = password;
        await api.updateUser(id, data);
        await queryClient.invalidateQueries({ queryKey: ["users"] });
        setPassword("");
        showToast("success", "Saved");
      }
    } catch (err) {
      showToast("error", `Couldn't save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!user) return;
    const ok = await confirm({
      title: "Delete user",
      message: `Delete "${user.name || user.email}"? They'll lose access immediately. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteUser(id);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("success", "User deleted");
      navigate("/settings/users", { replace: true });
    } catch (err) {
      showToast("error", `Couldn't delete: ${(err as Error).message}`);
    }
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4">
      <Link to="/settings/users" className="text-sm text-neutral-500 hover:text-white w-fit">
        ← Users
      </Link>

      <h1 className="text-xl font-semibold">{isNew ? "New user" : name || email || "User"}</h1>

      <div className="flex flex-col gap-3 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm text-neutral-400">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm text-neutral-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-neutral-400">
            {isNew ? "Password" : "New password (leave blank to keep current)"}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isNew ? "" : "••••••••"}
            className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAdmin}
            disabled={isSelf}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          <span className="text-neutral-500 text-sm">Admin{isSelf ? " (can't change your own)" : ""}</span>
        </label>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={save}
            disabled={saving || !name.trim() || !email.trim()}
            className="text-sm px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-neutral-200 disabled:opacity-50"
          >
            {saving ? "Saving…" : isNew ? "Create user" : "Save"}
          </button>
          {!isNew && !isSelf && (
            <button onClick={remove} className="text-sm text-red-400 hover:text-red-300">
              Delete user
            </button>
          )}
        </div>
      </div>

      {!isNew && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-400">Activity</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Prints" value={stats.prints} />
            <StatTile label="Logins" value={stats.logins} />
            <StatTile label="Page views" value={stats.pageViews} />
          </div>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto divide-y divide-neutral-900">
              {recentLogs.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-3 py-2 text-xs font-mono">
                  <span>{entry.summary}</span>
                  <span className="text-neutral-500 shrink-0">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
              ))}
              {recentLogs.length === 0 && <p className="px-3 py-6 text-neutral-500 text-sm">No activity yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
