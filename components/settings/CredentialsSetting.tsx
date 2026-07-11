"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface Account {
  username: string | null;
  hasPassword: boolean;
}

async function jsonOrThrow(res: Response) {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

export function CredentialsSetting() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);

  const account = useQuery<Account>({
    queryKey: ["credentials"],
    queryFn: async () => jsonOrThrow(await fetch("/api/settings/credentials")),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (account.data?.username) setUsername(account.data.username);
  }, [account.data?.username]);

  const update = useMutation({
    mutationFn: async (input: { username: string; password?: string }) =>
      jsonOrThrow(
        await fetch("/api/settings/credentials", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["credentials"], data);
      // Connection status will change as slskd reconnects.
      queryClient.invalidateQueries({ queryKey: ["application"] });
      setPassword("");
      setSaved(true);
    },
  });

  if (account.isLoading) {
    return (
      <div className="flex justify-center rounded-lg border border-edge bg-surface py-6">
        <Spinner />
      </div>
    );
  }

  if (account.error) {
    return (
      <div className="rounded-lg border border-edge bg-surface p-4">
        <p className="text-xs text-muted">{account.error.message}</p>
      </div>
    );
  }

  const dirty =
    (username.trim() && username.trim() !== (account.data?.username ?? "")) ||
    password.length > 0;

  const save = () => {
    setSaved(false);
    update.mutate({
      username: username.trim(),
      password: password || undefined,
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-edge bg-surface p-4">
      <div>
        <p className="text-sm text-secondary">Soulseek account</p>
        <p className="mt-0.5 text-xs text-muted">
          Password is write-only — it is stored for slskd&apos;s login and never
          shown or sent back to this app.
        </p>
      </div>

      <div className="space-y-2">
        <Input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setSaved(false);
          }}
          placeholder="username"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-xs"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setSaved(false);
          }}
          placeholder={
            account.data?.hasPassword
              ? "••••••••  (leave blank to keep current)"
              : "password"
          }
          autoComplete="new-password"
          className="font-mono text-xs"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={save}
          disabled={!dirty || !username.trim() || update.isPending}
          className="w-40"
        >
          {update.isPending ? <Spinner /> : "Save & Reconnect"}
        </Button>
        {saved && !dirty && (
          <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">
            Saved — reconnecting
          </span>
        )}
      </div>

      {update.error && (
        <p className="text-xs text-destructive">{update.error.message}</p>
      )}
    </div>
  );
}
