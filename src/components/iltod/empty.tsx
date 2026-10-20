"use client";

import { FileSearch02 } from "@untitledui/icons";

import { EmptyState } from "@/components/application/empty-state/empty-state";

export function Empty({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    // overflow-hidden: the decorative circle pattern is wider than a phone screen.
    <div className="overflow-hidden rounded-3xl bg-primary px-6 py-12 ring-1 ring-secondary ring-inset">
      <EmptyState size="md">
        <EmptyState.Header pattern="circle">
          <EmptyState.FeaturedIcon icon={FileSearch02} color="brand" theme="modern" />
        </EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{title}</EmptyState.Title>
          <EmptyState.Description>{description}</EmptyState.Description>
        </EmptyState.Content>
        {children && <EmptyState.Footer>{children}</EmptyState.Footer>}
      </EmptyState>
    </div>
  );
}
