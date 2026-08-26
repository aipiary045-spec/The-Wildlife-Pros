"use client";

import { enqueueMutation, listMutations, mutationCount, removeMutation } from "@/lib/offline-queue";
import { isQueueableFieldRequest, mutationLabel, queuedPayload, withOccurredAt } from "@/lib/offline";

const listeners = new Set<() => void>();

export function subscribeOfflineQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyOfflineQueue() {
  for (const listener of listeners) listener();
}

export async function pendingMutationCount() {
  if (typeof indexedDB === "undefined") return 0;
  try {
    return await mutationCount();
  } catch {
    return 0;
  }
}

export async function pendingMutationLabels(): Promise<string[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const items = await listMutations();
    return items.map((item) => item.label).filter(Boolean);
  } catch {
    return [];
  }
}

function queuedResponse() {
  return new Response(JSON.stringify(queuedPayload()), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}

async function queueRequest(url: string, method: string, body: string | null) {
  await enqueueMutation({
    url,
    method,
    body,
    label: mutationLabel(url),
  });
  notifyOfflineQueue();
  return queuedResponse();
}

export async function fieldFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const stamped = withOccurredAt(method, init, new Date().toISOString());
  const body = typeof stamped.body === "string" ? stamped.body : null;
  const requestInit: RequestInit = { credentials: "include", ...stamped };

  if (typeof navigator !== "undefined" && navigator.onLine === false && isQueueableFieldRequest(method, input)) {
    return queueRequest(input, method, body);
  }

  try {
    return await fetch(input, requestInit);
  } catch (error) {
    if (isQueueableFieldRequest(method, input)) {
      return queueRequest(input, method, body);
    }
    throw error;
  }
}

export async function flushOfflineQueue() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { flushed: 0, remaining: await pendingMutationCount() };
  }
  let flushed = 0;
  try {
    const items = await listMutations();
    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          credentials: "include",
          headers: item.body ? { "Content-Type": "application/json" } : undefined,
          body: item.body ?? undefined,
        });
        if (response.status === 401) break;
        // Offline clock-out can't show the on-site confirm — replay with force.
        if (
          response.status === 409 &&
          item.url.includes("/api/timesheets/clock") &&
          item.body
        ) {
          try {
            const parsed = JSON.parse(item.body) as { action?: string; force?: boolean };
            if (parsed.action === "out" && !parsed.force) {
              const retry = await fetch(item.url, {
                method: item.method,
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...parsed, force: true }),
              });
              if (retry.ok || (retry.status >= 400 && retry.status < 500)) {
                await removeMutation(item.id);
                flushed += 1;
                continue;
              }
            }
          } catch {
            // Fall through to normal 4xx handling.
          }
        }
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          await removeMutation(item.id);
          flushed += 1;
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  } catch {
    // IndexedDB missing — nothing to flush.
  }
  notifyOfflineQueue();
  return { flushed, remaining: await pendingMutationCount() };
}

export function isQueuedResponse(data: { queued?: unknown } | null | undefined) {
  return data?.queued === true;
}
