import assert from "node:assert/strict";
import { test } from "node:test";
import { exportFilename, isExportCategory, toCsv } from "./exports";

test("isExportCategory accepts known export ids", () => {
  assert.equal(isExportCategory("clients"), true);
  assert.equal(isExportCategory("species"), true);
  assert.equal(isExportCategory("nope"), false);
  assert.equal(isExportCategory("invoices"), false);
});

test("toCsv escapes commas, quotes, and newlines", () => {
  const csv = toCsv({
    name: "Clients",
    headers: ["id", "notes"],
    rows: [["c1", 'Said "hello", world\nnext line']],
  });
  assert.equal(csv, 'id,notes\r\nc1,"Said ""hello"", world\nnext line"');
});

test("exportFilename includes category and date", () => {
  assert.equal(
    exportFilename("jobs", new Date("2026-08-18T12:00:00.000Z")),
    "critterops-jobs-2026-08-18.csv",
  );
});
