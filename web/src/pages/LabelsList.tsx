import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function LabelsList() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery({ queryKey: ["labels"], queryFn: api.listLabels });

  async function remove(id: number) {
    if (!confirm("Delete this label template?")) return;
    await api.deleteLabel(id);
    queryClient.invalidateQueries({ queryKey: ["labels"] });
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Label templates</h1>
        <Link
          to="/labels/new"
          className="text-sm px-3 py-1.5 rounded-md bg-white text-black font-medium hover:bg-neutral-200"
        >
          New template
        </Link>
      </div>

      {isLoading && <p className="text-neutral-500 text-sm">Loading…</p>}

      <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800 overflow-hidden">
        {templates?.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-900">
            <Link to={`/labels/${t.id}`} className="flex flex-col">
              <span className="font-medium">{t.name}</span>
              <span className="text-neutral-500 text-xs">
                {t.widthMm}×{t.heightMm}mm · {t.elements.length} element{t.elements.length === 1 ? "" : "s"}
              </span>
            </Link>
            <button onClick={() => remove(t.id)} className="text-neutral-600 hover:text-red-400 text-xs">
              Delete
            </button>
          </div>
        ))}
        {!isLoading && templates?.length === 0 && (
          <p className="px-4 py-6 text-neutral-500 text-sm">No templates yet — create one to start printing labels.</p>
        )}
      </div>
    </div>
  );
}
