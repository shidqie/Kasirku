"use client";

import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export function DataTableContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 min-h-0 overflow-auto", className)}>
      {children}
    </div>
  );
}

export function DataTable({
  children,
  className,
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        "w-full text-left text-xs text-slate-600 dark:text-zinc-300 border-collapse",
        className
      )}
    >
      {children}
    </table>
  );
}

export function DataTableHeader({
  children,
  className,
  sticky = true,
}: React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }) {
  return (
    <thead
      className={cn(
        sticky && "sticky top-0 z-10 bg-white dark:bg-zinc-900",
        "border-b border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400",
        className
      )}
    >
      {children}
    </thead>
  );
}

export function DataTableHead({
  children,
  className,
  align = "left",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={cn(
        "py-3 px-4 first:pl-0 last:pr-0 font-medium whitespace-nowrap",
        ALIGN_CLASS[align],
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function DataTableBody({
  children,
  className,
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        "divide-y divide-slate-100 dark:divide-zinc-800 font-sans",
        className
      )}
    >
      {children}
    </tbody>
  );
}

export function DataTableRow({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  className,
  align = "left",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "center" | "right";
}) {
  return (
    <td
      className={cn(
        "py-3.5 px-4 first:pl-0 last:pr-0",
        ALIGN_CLASS[align],
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function DataTableEmpty({
  colSpan,
  children,
  className,
}: {
  colSpan: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={cn(
          "text-center py-10 text-slate-400 dark:text-zinc-500",
          className
        )}
      >
        {children}
      </td>
    </tr>
  );
}
