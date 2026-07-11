"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface Track {
  /** Path passed to /api/audio — the track's identity. */
  file: string;
  title: string;
  artist?: string;
  /** Cover art URL (used by the lockscreen / media session). */
  artwork?: string;
}

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  track: Track | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  repeat: RepeatMode;
  hasNext: boolean;
  hasPrevious: boolean;
  /** Plays a track. Pass a queue to enable next/previous within it. */
  play: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  seek: (time: number) => void;
  next: () => void;
  previous: () => void;
  cycleRepeat: () => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  const track = index >= 0 ? queue[index] ?? null : null;

  const loadAndPlay = useCallback((t: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(0);
    setDuration(0);
    audio.src = `/api/audio?file=${encodeURIComponent(t.file)}`;
    void audio.play();
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const t = queue[i];
      if (!t) return;
      setIndex(i);
      loadAndPlay(t);
    },
    [queue, loadAndPlay]
  );

  // Auto-advance needs current state inside the `ended` listener.
  const onEndedRef = useRef<() => void>(() => {});
  onEndedRef.current = () => {
    const audio = audioRef.current;
    if (repeat === "one" && audio) {
      audio.currentTime = 0;
      void audio.play();
      return;
    }
    if (index + 1 < queue.length) {
      goTo(index + 1);
    } else if (repeat === "all" && queue.length > 0) {
      goTo(0);
    } else {
      setPlaying(false);
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => onEndedRef.current();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const play = useCallback(
    (next: Track, newQueue?: Track[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (track?.file === next.file) {
        // Same track — treat as play/pause toggle.
        if (audio.paused) void audio.play();
        else audio.pause();
        return;
      }

      const q = newQueue && newQueue.length > 0 ? newQueue : [next];
      const i = Math.max(
        q.findIndex((t) => t.file === next.file),
        0
      );
      setQueue(q);
      setIndex(i);
      loadAndPlay(q[i]);
    },
    [track?.file, loadAndPlay]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [track]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const next = useCallback(() => {
    if (index + 1 < queue.length) goTo(index + 1);
    else if (repeat === "all" && queue.length > 0) goTo(0);
  }, [index, queue.length, repeat, goTo]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    // Restart the current track if we're a few seconds in.
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (index > 0) goTo(index - 1);
    else if (repeat === "all" && queue.length > 0) goTo(queue.length - 1);
    else if (audio) audio.currentTime = 0;
  }, [index, queue.length, repeat, goTo]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    setQueue([]);
    setIndex(-1);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Media Session — lockscreen / control-center integration (iPhone PWA).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? "Apollo",
      artwork: track.artwork
        ? [{ src: track.artwork, sizes: "512x512" }]
        : undefined,
    });
  }, [track]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => audioRef.current?.play());
    ms.setActionHandler("pause", () => audioRef.current?.pause());
    ms.setActionHandler("previoustrack", previous);
    ms.setActionHandler("nexttrack", next);
    ms.setActionHandler("seekto", (e) => {
      if (e.seekTime != null) seek(e.seekTime);
    });
    return () => {
      ms.setActionHandler("play", null);
      ms.setActionHandler("pause", null);
      ms.setActionHandler("previoustrack", null);
      ms.setActionHandler("nexttrack", null);
      ms.setActionHandler("seekto", null);
    };
  }, [previous, next, seek]);

  return (
    <PlayerContext.Provider
      value={{
        track,
        playing,
        currentTime,
        duration,
        repeat,
        hasNext: index + 1 < queue.length || (repeat === "all" && queue.length > 1),
        hasPrevious: index > 0 || (repeat === "all" && queue.length > 1),
        play,
        toggle,
        seek,
        next,
        previous,
        cycleRepeat,
        stop,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
