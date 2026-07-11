# Thought experiment: Soulseek shuts down — can I still P2P with a friend?

Short answer: yes. The Soulseek *server* is only a matchmaker. Every actual
file transfer is already peer-to-peer between you and the other user. If the
central server (`server.slsknet.org`) disappeared tomorrow, the protocol,
the clients, and slskd would all still work — they would just have no way to
*find* each other. So the problem to solve is discovery, not transfer.

Here are the realistic options, best first.

## Option 1 — Run your own Soulseek server, connect over Tailscale

There is an open-source implementation of the Soulseek server protocol:
[Soulfind](https://github.com/soulfind-dev/soulfind). It speaks the same
protocol as the official server, so slskd (and Nicotine+, etc.) can connect
to it unmodified.

The setup for you + a friend on different networks:

1. You run Soulfind on your machine (it is tiny — a single daemon listening
   on port 2242).
2. Both of you join the same Tailscale tailnet (Tailscale supports sharing
   individual machines to other people's tailnets, so your friend does not
   need to be "in" your network fully).
3. Both slskd instances point at your tailnet address instead of the
   official server:

```yaml
soulseek:
  address: 100.x.y.z   # your machine's Tailscale IP
  port: 2242
```

4. You both log in with any username — it's your server, you are the
   userbase now. Search, browse, queue, and transfers work exactly as they
   do today, including through Apollo, because slskd's API doesn't change
   at all.

Why this is the best option: nothing about your tooling changes. Apollo,
slskd, the queue, the Listen tab — all of it keeps working, because the
only thing that moved is the matchmaker.

The Tailscale trick also solves NAT traversal: normally two peers behind
different home routers need port forwarding for direct connections, but
inside a tailnet every machine can reach every other machine directly, so
even "firewalled" peers connect without touching a router.

## Option 2 — Direct share over Tailscale, no Soulseek at all

If it is literally just two people, you don't need the Soulseek protocol:

- Your friend joins your tailnet (or you share one machine to theirs).
- You expose your music folder over HTTP: even `npx serve "C:\Music"` works,
  or Apollo's own `/api/library/downloads` + `/api/audio` endpoints behind
  `tailscale serve`.
- They browse and pull files directly; Tailscale encrypts everything
  end-to-end (WireGuard).

Zero new infrastructure, but you lose search-across-both-libraries and the
download queue — it's a file server, not a P2P network.

## Option 3 — The broader decentralised route

If the goal is "Soulseek-like network with no central anything":

- **BitTorrent + a private tracker** (or DHT with magnet links) — great for
  distribution, clunky for browsing a friend's whole library.
- **IPFS** — content-addressed sharing, but discovery of *new* content still
  needs you to exchange hashes out-of-band.
- **Hosting Soulfind on a VPS** — same as Option 1 but always-on and
  reachable by more friends without tailnet sharing; the server sees only
  metadata (searches, user lists), transfers stay peer-to-peer.

## The punchline

Soulseek's architecture is already 90% what you would design for this
scenario: a dumb rendezvous point plus direct peer transfers. "Surviving
the server shutting down" just means bringing your own rendezvous point —
and with Tailscale, the traditionally hard parts (NAT traversal, encryption,
authentication) are already solved in the tunnel layer.
