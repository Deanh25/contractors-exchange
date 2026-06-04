import { requireCapability } from "@/lib/admin";
import { getCategoryList, type CategoryNode } from "@/lib/categories";
import {
  createCategoryAction,
  renameCategoryAction,
  moveCategoryAction,
  reorderCategoryAction,
  archiveCategoryAction,
  deleteCategoryAction,
} from "@/app/actions/admin-categories";

const ERRORS: Record<string, string> = {
  name: "Enter a category name.",
  cycle: "A category can't be moved under itself or one of its descendants.",
  haschildren: "Remove or move the subcategories first, or archive instead.",
  inuse: "Listings use this category. Archive it instead of deleting.",
};

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireCapability("categories");
  const sp = await searchParams;
  const list = await getCategoryList();
  // Parent options for the "move" control (label indented by depth).
  const parentOptions = list.map((c) => ({
    id: c.id,
    label: `${"  ".repeat(c.depth)}${c.name}`,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
      <p className="mt-1 text-sm text-slate-500">
        The catalog taxonomy. Nest to any depth; listings attach to the deepest
        (leaf) categories. Renaming keeps existing listings linked. Margins are set
        per leaf in the Margins module.
      </p>

      {sp.error && ERRORS[sp.error] && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERRORS[sp.error]}
        </p>
      )}

      {/* Add a top-level category */}
      <form
        action={createCategoryAction}
        className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"
      >
        <input
          name="name"
          placeholder="New top-level category…"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Add category
        </button>
      </form>

      <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {list.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            No categories yet.
          </p>
        ) : (
          list.map((c) => (
            <NodeRow key={c.id} node={c} parentOptions={parentOptions} />
          ))
        )}
      </div>
    </div>
  );
}

function NodeRow({
  node,
  parentOptions,
}: {
  node: CategoryNode;
  parentOptions: { id: string; label: string }[];
}) {
  const isLeaf = node.children.length === 0;
  return (
    <div
      className="px-4 py-2.5"
      style={{ paddingLeft: `${1 + node.depth * 1.5}rem` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-300">{isLeaf ? "•" : "▸"}</span>
        <span className={`font-medium ${node.archived ? "text-slate-400 line-through" : "text-slate-900"}`}>
          {node.name}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {isLeaf ? "leaf" : `${node.children.length}`}
        </span>
        {node.archived && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Archived
          </span>
        )}
        <code className="text-[10px] text-slate-300">{node.slug}</code>

        <div className="ml-auto flex items-center gap-1">
          <MiniForm action={reorderCategoryAction} id={node.id} extra={{ dir: "up" }} label="↑" />
          <MiniForm action={reorderCategoryAction} id={node.id} extra={{ dir: "down" }} label="↓" />
          <MiniForm
            action={archiveCategoryAction}
            id={node.id}
            extra={{ value: node.archived ? "0" : "1" }}
            label={node.archived ? "Restore" : "Archive"}
          />
        </div>
      </div>

      {/* Secondary actions */}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-6">
        <Pop label="+ Subcategory">
          <form action={createCategoryAction} className="flex items-center gap-1.5">
            <input type="hidden" name="parentId" value={node.id} />
            <input
              name="name"
              placeholder="Subcategory name"
              className="w-44 rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <Submit>Add</Submit>
          </form>
        </Pop>

        <Pop label="Rename">
          <form action={renameCategoryAction} className="flex items-center gap-1.5">
            <input type="hidden" name="id" value={node.id} />
            <input
              name="name"
              defaultValue={node.name}
              className="w-44 rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <Submit>Save</Submit>
          </form>
        </Pop>

        <Pop label="Move">
          <form action={moveCategoryAction} className="flex items-center gap-1.5">
            <input type="hidden" name="id" value={node.id} />
            <select
              name="parentId"
              defaultValue={node.parentId ?? ""}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="">Top level</option>
              {parentOptions
                .filter((p) => p.id !== node.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
            </select>
            <Submit>Move</Submit>
          </form>
        </Pop>

        {isLeaf && (
          <Pop label="Delete" danger>
            <form action={deleteCategoryAction} className="flex items-center gap-1.5">
              <input type="hidden" name="id" value={node.id} />
              <span className="text-xs text-slate-500">Delete if unused?</span>
              <button
                type="submit"
                className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </form>
          </Pop>
        )}
      </div>
    </div>
  );
}

function MiniForm({
  action,
  id,
  extra,
  label,
}: {
  action: (formData: FormData) => void;
  id: string;
  extra: Record<string, string>;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {Object.entries(extra).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
      >
        {label}
      </button>
    </form>
  );
}

function Pop({
  label,
  danger,
  children,
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details>
      <summary
        className={`cursor-pointer list-none rounded-md px-2 py-1 text-xs font-medium hover:bg-slate-50 ${
          danger ? "text-red-600" : "text-slate-600"
        }`}
      >
        {label}
      </summary>
      <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
        {children}
      </div>
    </details>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
    >
      {children}
    </button>
  );
}
