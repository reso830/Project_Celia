import "server-only";
import type Database from "better-sqlite3";
import type {
  BudgetModel,
  MonthlyBudgetPlan,
  BudgetAllocationLine,
  AllocationTargetType,
} from "@/domain/budget";
const allocationColumns = `id,target_type AS targetType,category_id AS categoryId,bucket_id AS bucketId,amount,updated_at AS updatedAt`;
const modelColumns = `id,name,name_key AS nameKey,description,display_order AS displayOrder,created_at AS createdAt,updated_at AS updatedAt`;
function allocations(
  db: Database.Database,
  monthly: boolean,
  id: string,
): BudgetAllocationLine[] {
  return db
    .prepare(
      `SELECT ${allocationColumns} FROM ${monthly ? "monthly_budget_allocations" : "budget_model_allocations"} WHERE ${monthly ? "plan_id" : "model_id"}=? ORDER BY target_type,category_id,bucket_id`,
    )
    .all(id) as BudgetAllocationLine[];
}
export function listBudgetModels(db: Database.Database): BudgetModel[] {
  return (
    db
      .prepare(
        `SELECT ${modelColumns} FROM budget_models ORDER BY display_order,created_at,id`,
      )
      .all() as Omit<BudgetModel, "allocations">[]
  ).map((m) => ({ ...m, allocations: allocations(db, false, m.id) }));
}
export function findBudgetModelById(
  db: Database.Database,
  id: string,
): BudgetModel | null {
  const m = db
    .prepare(`SELECT ${modelColumns} FROM budget_models WHERE id=?`)
    .get(id) as Omit<BudgetModel, "allocations"> | undefined;
  return m ? { ...m, allocations: allocations(db, false, id) } : null;
}
export function insertBudgetModel(db: Database.Database, m: BudgetModel) {
  db.prepare(
    "INSERT INTO budget_models (id,name,name_key,description,display_order,created_at,updated_at) VALUES (@id,@name,@nameKey,@description,@displayOrder,@createdAt,@updatedAt)",
  ).run(m);
  return findBudgetModelById(db, m.id)!;
}
export function updateBudgetModelMetadata(
  db: Database.Database,
  m: BudgetModel,
) {
  db.prepare(
    "UPDATE budget_models SET name=@name,name_key=@nameKey,description=@description,display_order=@displayOrder,updated_at=@updatedAt WHERE id=@id",
  ).run(m);
}
function upsertAllocation(
  db: Database.Database,
  monthly: boolean,
  ownerId: string,
  line: BudgetAllocationLine,
) {
  const table = monthly
      ? "monthly_budget_allocations"
      : "budget_model_allocations",
    owner = monthly ? "plan_id" : "model_id",
    target = line.targetType === "category" ? "category_id" : "bucket_id";
  db.prepare(
    `INSERT INTO ${table} (id,${owner},target_type,category_id,bucket_id,amount,updated_at) VALUES (@id,@ownerId,@targetType,@categoryId,@bucketId,@amount,@updatedAt) ON CONFLICT (${owner},${target}) WHERE ${target} IS NOT NULL DO UPDATE SET amount=excluded.amount,updated_at=excluded.updated_at`,
  ).run({ ...line, ownerId });
}
export function upsertBudgetModelAllocation(
  db: Database.Database,
  line: BudgetAllocationLine & { modelId: string },
) {
  upsertAllocation(db, false, line.modelId, line);
}
export function upsertMonthlyBudgetAllocation(
  db: Database.Database,
  line: BudgetAllocationLine & { planId: string },
) {
  upsertAllocation(db, true, line.planId, line);
}
function deleteAllocation(
  db: Database.Database,
  monthly: boolean,
  id: string,
  type: AllocationTargetType,
  targetId: string,
) {
  db.prepare(
    `DELETE FROM ${monthly ? "monthly_budget_allocations" : "budget_model_allocations"} WHERE ${monthly ? "plan_id" : "model_id"}=? AND ${type === "category" ? "category_id" : "bucket_id"}=?`,
  ).run(id, targetId);
}
export function deleteBudgetModelAllocation(
  db: Database.Database,
  modelId: string,
  type: AllocationTargetType,
  targetId: string,
) {
  deleteAllocation(db, false, modelId, type, targetId);
}
export function deleteMonthlyBudgetAllocation(
  db: Database.Database,
  planId: string,
  type: AllocationTargetType,
  targetId: string,
) {
  deleteAllocation(db, true, planId, type, targetId);
}
export function deleteBudgetModel(db: Database.Database, id: string) {
  return (
    db.prepare("DELETE FROM budget_models WHERE id=?").run(id).changes === 1
  );
}
export function findMonthlyBudgetPlan(
  db: Database.Database,
  monthKey: string,
): MonthlyBudgetPlan | null {
  const row = db
    .prepare(
      `SELECT id,month_key AS monthKey,source_model_id AS sourceModelId,model_name AS modelName,is_revised AS isRevised,applied_at AS appliedAt,updated_at AS updatedAt FROM monthly_budget_plans WHERE month_key=?`,
    )
    .get(monthKey) as
    | (Omit<MonthlyBudgetPlan, "allocations" | "isRevised"> & {
        isRevised: number;
      })
    | undefined;
  return row
    ? {
        ...row,
        isRevised: row.isRevised === 1,
        allocations: allocations(db, true, row.id),
      }
    : null;
}
export function upsertMonthlyBudgetPlan(
  db: Database.Database,
  p: MonthlyBudgetPlan,
) {
  db.prepare(
    `INSERT INTO monthly_budget_plans (id,month_key,source_model_id,model_name,is_revised,applied_at,updated_at) VALUES (@id,@monthKey,@sourceModelId,@modelName,@isRevised,@appliedAt,@updatedAt) ON CONFLICT (month_key) DO UPDATE SET source_model_id=excluded.source_model_id,model_name=excluded.model_name,is_revised=excluded.is_revised,applied_at=excluded.applied_at,updated_at=excluded.updated_at`,
  ).run({ ...p, isRevised: Number(p.isRevised) });
}
export function replaceMonthlyBudgetAllocations(
  db: Database.Database,
  planId: string,
  lines: readonly BudgetAllocationLine[],
) {
  db.prepare("DELETE FROM monthly_budget_allocations WHERE plan_id=?").run(
    planId,
  );
  for (const line of lines) upsertAllocation(db, true, planId, line);
}
export function mergeCategoryAllocationsInModels(
  db: Database.Database,
  sourceCategoryId: string,
  targetCategoryId: string,
  now: string,
) {
  const sources = db
    .prepare(
      `SELECT ${allocationColumns},model_id AS modelId FROM budget_model_allocations WHERE category_id=?`,
    )
    .all(sourceCategoryId) as (BudgetAllocationLine & { modelId: string })[];
  for (const source of sources) {
    const target = db
      .prepare(
        "SELECT amount FROM budget_model_allocations WHERE model_id=? AND category_id=?",
      )
      .get(source.modelId, targetCategoryId) as { amount: number } | undefined;
    if (target) {
      upsertBudgetModelAllocation(db, {
        ...source,
        id: crypto.randomUUID(),
        categoryId: targetCategoryId,
        amount: source.amount + target.amount,
        updatedAt: now,
      });
      deleteBudgetModelAllocation(
        db,
        source.modelId,
        "category",
        sourceCategoryId,
      );
    } else
      db.prepare(
        "UPDATE budget_model_allocations SET category_id=?,updated_at=? WHERE id=?",
      ).run(targetCategoryId, now, source.id);
    db.prepare("UPDATE budget_models SET updated_at=? WHERE id=?").run(
      now,
      source.modelId,
    );
  }
}
