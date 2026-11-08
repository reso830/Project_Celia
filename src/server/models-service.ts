import "server-only";
import type Database from "better-sqlite3";
import type {
  BudgetModel,
  BudgetAllocationLine,
  MonthlyBudgetPlan,
} from "@/domain/budget";
import { parseAndValidateNonNegativeAmount } from "@/domain/amount";
import { DomainError } from "@/domain/errors";
import { isValidMonthKey } from "@/domain/month";
import { validateName, nameKey } from "@/domain/names";
import { findCategory } from "./categories-store";
import { findSavingsBucketById } from "./savings-store";
import { getDatabase } from "./db/database";
import * as store from "./models-store";
import { timestamp } from "./timestamp";
export type ModelDraft = { name: string; description?: string };
export type AllocationPatch = {
  targetType: string;
  targetId: string;
  amount: string;
};
export type ModelPatch = Partial<ModelDraft & AllocationPatch>;
function invalid(message: string, field?: string): never {
  throw new DomainError("validation", message, field);
}
function requiredModel(db: Database.Database, id: string) {
  const m = store.findBudgetModelById(db, id);
  if (!m) throw new DomainError("not_found", "Budget model not found.");
  return m;
}
function uniqueName(db: Database.Database, raw: string, id?: string) {
  const name = validateName(raw);
  if (
    store
      .listBudgetModels(db)
      .some((m) => m.nameKey === nameKey(name) && m.id !== id)
  )
    throw new DomainError(
      "duplicate_name",
      "A budget model with this name already exists.",
      "name",
    );
  return name;
}
function activeTarget(db: Database.Database, type: string, id: string) {
  if (type === "category") {
    const c = findCategory(db, id, { includeMerged: true });
    if (!c)
      throw new DomainError("not_found", "Category not found.", "targetId");
    return c.archivedAt === null && c.mergedIntoCategoryId === null;
  }
  if (type === "bucket") {
    const b = findSavingsBucketById(db, id);
    if (!b) throw new DomainError("not_found", "Bucket not found.", "targetId");
    return b.archivedAt === null;
  }
  return invalid("Choose category or bucket.", "targetType");
}
function allocation(
  db: Database.Database,
  patch: Partial<AllocationPatch>,
): BudgetAllocationLine {
  if (patch.targetType !== "category" && patch.targetType !== "bucket")
    invalid("Choose category or bucket.", "targetType");
  if (!patch.targetId || patch.amount === undefined)
    invalid("Provide targetType, targetId and amount.");
  const amount = parseAndValidateNonNegativeAmount(patch.amount);
  if (!amount.ok) invalid(amount.error, amount.field);
  const active = activeTarget(db, patch.targetType, patch.targetId);
  if (!active && amount.centavos > 0)
    throw new DomainError(
      "archived",
      "Archived categories and buckets cannot receive new budget allocations; set the amount to 0 to remove it.",
    );
  return {
    id: crypto.randomUUID(),
    targetType: patch.targetType,
    categoryId: patch.targetType === "category" ? patch.targetId : null,
    bucketId: patch.targetType === "bucket" ? patch.targetId : null,
    amount: amount.centavos,
    updatedAt: timestamp(),
  };
}
export function createBudgetModel(
  draft: ModelDraft,
  db: Database.Database = getDatabase(),
): BudgetModel {
  return db.transaction(() => {
    const name = uniqueName(db, draft.name);
    const now = timestamp();
    return store.insertBudgetModel(db, {
      id: crypto.randomUUID(),
      name,
      nameKey: nameKey(name),
      description: draft.description?.trim() || null,
      displayOrder: store
        .listBudgetModels(db)
        .reduce((n, m) => Math.max(n, m.displayOrder + 1), 0),
      allocations: [],
      createdAt: now,
      updatedAt: now,
    });
  })();
}
export function updateBudgetModel(
  id: string,
  patch: ModelPatch,
  db: Database.Database = getDatabase(),
): BudgetModel {
  return db.transaction(() => {
    const previous = requiredModel(db, id);
    if (!Object.keys(patch).length) invalid("Provide a field to update.");
    const hasAllocation =
      patch.targetType !== undefined ||
      patch.targetId !== undefined ||
      patch.amount !== undefined;
    const line = hasAllocation ? allocation(db, patch) : null;
    const name =
      patch.name === undefined ? previous.name : uniqueName(db, patch.name, id);
    store.updateBudgetModelMetadata(db, {
      ...previous,
      name,
      nameKey: nameKey(name),
      description:
        patch.description === undefined
          ? previous.description
          : patch.description.trim() || null,
      updatedAt: timestamp(),
    });
    if (line) {
      if (line.amount === 0)
        store.deleteBudgetModelAllocation(
          db,
          id,
          line.targetType,
          (line.categoryId ?? line.bucketId)!,
        );
      else store.upsertBudgetModelAllocation(db, { ...line, modelId: id });
    }
    return requiredModel(db, id);
  })();
}
export function duplicateBudgetModel(
  id: string,
  draft: Partial<ModelDraft> = {},
  db: Database.Database = getDatabase(),
): BudgetModel {
  return db.transaction(() => {
    const source = requiredModel(db, id);
    let name = draft.name?.trim();
    if (!name) {
      let index = 1;
      const names = new Set(store.listBudgetModels(db).map((m) => m.nameKey));
      do {
        name = `${source.name} (Copy${index === 1 ? "" : ` ${index}`})`;
        index++;
      } while (names.has(nameKey(name)));
    }
    const copy = createBudgetModel(
      {
        name,
        description:
          draft.description === undefined
            ? (source.description ?? "")
            : draft.description,
      },
      db,
    );
    for (const l of source.allocations)
      store.upsertBudgetModelAllocation(db, {
        ...l,
        id: crypto.randomUUID(),
        updatedAt: copy.updatedAt,
        modelId: copy.id,
      });
    return requiredModel(db, copy.id);
  })();
}
export function deleteBudgetModel(
  id: string,
  db: Database.Database = getDatabase(),
) {
  return db.transaction(() => {
    requiredModel(db, id);
    store.deleteBudgetModel(db, id);
    return id;
  })();
}
export function applyBudgetModelToMonth(
  modelId: string,
  monthKey: string,
  db: Database.Database = getDatabase(),
): MonthlyBudgetPlan {
  return db.transaction(() => {
    if (!isValidMonthKey(monthKey))
      invalid("Enter a valid month (YYYY-MM).", "monthKey");
    const m = requiredModel(db, modelId);
    const previous = store.findMonthlyBudgetPlan(db, monthKey);
    const now = timestamp();
    const lines = m.allocations
      .filter((l) =>
        activeTarget(db, l.targetType, (l.categoryId ?? l.bucketId)!),
      )
      .map((l) => ({ ...l, id: crypto.randomUUID(), updatedAt: now }));
    const plan: MonthlyBudgetPlan = {
      id: previous?.id ?? crypto.randomUUID(),
      monthKey,
      sourceModelId: m.id,
      modelName: m.name,
      isRevised: false,
      allocations: lines,
      appliedAt: now,
      updatedAt: now,
    };
    store.upsertMonthlyBudgetPlan(db, plan);
    store.replaceMonthlyBudgetAllocations(db, plan.id, lines);
    return store.findMonthlyBudgetPlan(db, monthKey)!;
  })();
}
export function reviseMonthlyBudgetPlan(
  monthKey: string,
  patch: AllocationPatch,
  db: Database.Database = getDatabase(),
): MonthlyBudgetPlan {
  return db.transaction(() => {
    if (!isValidMonthKey(monthKey))
      invalid("Enter a valid month (YYYY-MM).", "monthKey");
    const previous = store.findMonthlyBudgetPlan(db, monthKey);
    if (!previous)
      throw new DomainError("not_found", "No plan is applied for this month.");
    const line = allocation(db, patch);
    if (line.amount === 0)
      store.deleteMonthlyBudgetAllocation(
        db,
        previous.id,
        line.targetType,
        (line.categoryId ?? line.bucketId)!,
      );
    else
      store.upsertMonthlyBudgetAllocation(db, { ...line, planId: previous.id });
    store.upsertMonthlyBudgetPlan(db, {
      ...previous,
      isRevised: true,
      updatedAt: timestamp(),
    });
    return store.findMonthlyBudgetPlan(db, monthKey)!;
  })();
}
