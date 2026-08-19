import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, pick, type RentmanRecord } from "../lib/api";
import RecordFields from "../components/RecordFields";

export default function ProjectDetail() {
  const { id = "" } = useParams();
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.getProject(id),
  });
  const { data: equipment } = useQuery({
    queryKey: ["project-equipment", id],
    queryFn: () => api.getProjectEquipment(id),
  });

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <Link to="/projects" className="text-sm text-neutral-500 hover:text-white w-fit">
        ← Projects
      </Link>

      {isLoading && <p className="text-neutral-500 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">Couldn't load this project: {(error as Error).message}</p>}

      {project && (
        <>
          <h1 className="text-xl font-semibold">{pick(project, "name", "displayname", "title")}</h1>

          <section className="border border-neutral-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-neutral-400 mb-3">Project details</h2>
            <RecordFields record={project} />
          </section>

          {project.subprojects?.length > 0 && (
            <section className="border border-neutral-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-neutral-400 mb-3">Subprojects</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {project.subprojects.map((s: RentmanRecord) => (
                  <li key={s.id}>{pick(s, "name", "displayname", "title")}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="border border-neutral-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-neutral-400 mb-3">Planned equipment</h2>
            {!equipment ? (
              <p className="text-neutral-500 text-sm">Loading…</p>
            ) : equipment.lines.length === 0 ? (
              <p className="text-neutral-500 text-sm">No equipment lines returned for this project.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {equipment.lines.map((line) => {
                  const serialIds = String(line.serial_number_ids ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  return (
                    <li key={line.id} className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span>{pick(line, "name", "equipment_name", "displayname")}</span>
                        <span className="text-neutral-500">×{pick(line, "quantity", "qty")}</span>
                      </div>
                      {serialIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {serialIds.map((sid) => (
                            <Link
                              key={sid}
                              to={`/assets/${sid}`}
                              className="text-xs font-mono text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5"
                            >
                              #{sid}
                            </Link>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
