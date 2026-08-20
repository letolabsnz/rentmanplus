import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function UsersPage() {
  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: api.listUsers });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Link
          to="/users/new"
          className="text-sm px-3 py-1.5 rounded-md bg-white text-black font-medium hover:bg-neutral-200"
        >
          New user
        </Link>
      </div>

      {isLoading && <p className="text-neutral-500 text-sm">Loading…</p>}

      <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800 overflow-hidden">
        {users?.map((u) => (
          <Link
            key={u.id}
            to={`/users/${u.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-900"
          >
            <div className="flex flex-col">
              <span className="font-medium">{u.name || u.email}</span>
              <span className="text-neutral-500 text-xs">{u.email}</span>
            </div>
            {u.isAdmin && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                Admin
              </span>
            )}
          </Link>
        ))}
        {!isLoading && users?.length === 0 && <p className="px-4 py-6 text-neutral-500 text-sm">No users yet.</p>}
      </div>
    </div>
  );
}
