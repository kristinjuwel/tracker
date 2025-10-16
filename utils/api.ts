// utils/api.ts
import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data as any, typeof init === "number" ? { status: init } : init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function assert<T>(cond: any, message: string): asserts cond {
  if (!cond) throw new Error(message);
}
