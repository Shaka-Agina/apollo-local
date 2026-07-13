"use client";

import { useApplication } from "@/hooks/useApplication";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { DownloadFolderSetting } from "@/components/settings/DownloadFolderSetting";
import { CredentialsSetting } from "@/components/settings/CredentialsSetting";
import { SharingSetting } from "@/components/settings/SharingSetting";
import { AppearanceSetting } from "@/components/settings/AppearanceSetting";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4 border-t border-edge px-4 py-3 first:border-t-0">
      <span className="text-sm text-secondary">{label}</span>
      <span className="text-right font-mono text-sm text-primary">
        {children}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { data: app, isLoading, error } = useApplication();

  const connected = app?.server?.isConnected ?? false;
  const loggedIn = app?.server?.isLoggedIn ?? false;

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-primary">
        Settings
      </h1>

      <section>
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
          Appearance
        </h2>
        <AppearanceSetting />
      </section>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive px-4 py-3">
          <p className="font-mono text-sm text-destructive">slskd unreachable</p>
          <p className="mt-1 text-xs text-secondary">
            Verify the slskd container is running and SLSKD_URL / SLSKD_API_KEY
            are set in .env.local.
          </p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
              Connection
            </h2>
            <div className="overflow-hidden rounded-lg border border-edge bg-surface">
              <Row label="Soulseek server">
                {connected ? (
                  <Badge tone="active">Connected</Badge>
                ) : (
                  <Badge tone="destructive">Disconnected</Badge>
                )}
              </Row>
              <Row label="Logged in">
                {loggedIn ? (
                  <Badge tone="active">Yes</Badge>
                ) : (
                  <Badge tone="destructive">No</Badge>
                )}
              </Row>
              <Row label="Username">{app?.user?.username ?? "—"}</Row>
              <Row label="Server address">{app?.server?.address ?? "—"}</Row>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
              Account
            </h2>
            <CredentialsSetting />
          </section>

          <section>
            <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
              Downloads
            </h2>
            <DownloadFolderSetting />
          </section>

          <section>
            <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
              Shares
            </h2>
            <div className="space-y-2">
              <SharingSetting />
              <div className="overflow-hidden rounded-lg border border-edge bg-surface">
                <Row label="Shared directories">
                  {app?.shares?.directories ?? 0}
                </Row>
                <Row label="Shared files">{app?.shares?.files ?? 0}</Row>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
              About
            </h2>
            <div className="overflow-hidden rounded-lg border border-edge bg-surface">
              <Row label="slskd version">{app?.version?.current ?? "—"}</Row>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
