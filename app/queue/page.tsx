"use client";

import { useTransfers } from "@/hooks/useTransfers";
import { TransferList } from "@/components/transfers/TransferList";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function QueuePage() {
  const { data: transfers, isLoading, error } = useTransfers();

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-primary">
        Queue
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <EmptyState
          title="Cannot reach slskd"
          hint="Check that the slskd container is running and SLSKD_URL is correct."
        />
      ) : (
        <TransferList transfers={transfers ?? []} />
      )}
    </div>
  );
}
