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
  queue: Track[];
  queueIndex: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  /** Plays a track. Pass a queue to enable next/previous within it. */
  play: (track: Track, queue?: Track[]) => void;
  /** Append to the up-next list (starts playback if nothing is playing). */
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  playAt: (index: number) => void;
  clearQueue: () => void;
  /** Shuffle `tracks` and start from a random song. */
  playShuffle: (tracks: Track[]) => void;
  toggle: () => void;
  seek: (time: number) => void;
  next: () => void;
  previous: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

function shuffleArray<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);

  const queueRef = useRef(queue);
  const indexRef = useRef(index);
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);
  queueRef.current = queue;
  indexRef.current = index;
  repeatRef.current = repeat;
  shuffleRef.current = shuffle;

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
      const t = queueRef.current[i];
      if (!t) return;
      setIndex(i);
      loadAndPlay(t);
    },
    [loadAndPlay]
  );

  const pickNextIndex = useCallback((from: number, q: Track[]): number | null => {
    if (q.length === 0) return null;
    if (shuffleRef.current && q.length > 1) {
      if (q.length === 2) return from === 0 ? 1 : 0;
      let next = from;
      while (next === from) {
        next = Math.floor(Math.random() * q.length);
      }
      return next;
    }
    if (from + 1 < q.length) return from + 1;
    if (repeatRef.current === "all") return 0;
    return null;
  }, []);

  const onEndedRef = useRef<() => void>(() => {});
  onEndedRef.current = () => {
    const audio = audioRef.current;
    const q = queueRef.current;
    const i = indexRef.current;
    if (repeatRef.current === "one" && audio) {
      audio.currentTime = 0;
      void audio.play();
      return;
    }
    const nextIdx = pickNextIndex(i, q);
    if (nextIdx != null) goTo(nextIdx);
    else setPlaying(false);
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

      if (track?.file === next.file && (!newQueue || newQueue.length === 0)) {
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
      loadAndPlay(q[i]!);
    },
    [track?.file, loadAndPlay]
  );

  const addToQueue = useCallback(
    (t: Track) => {
      setQueue((q) => {
        if (q.length === 0) {
          setIndex(0);
          loadAndPlay(t);
          return [t];
        }
        return [...q, t];
      });
    },
    [loadAndPlay]
  );

  const removeFromQueue = useCallback((removeIndex: number) => {
    setQueue((q) => {
      if (removeIndex < 0 || removeIndex >= q.length) return q;
      const nextQ = q.filter((_, i) => i !== removeIndex);
      setIndex((cur) => {
        if (nextQ.length === 0) {
          const audio = audioRef.current;
          if (audio) {
            audio.pause();
            audio.src = "";
          }
          setPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          return -1;
        }
        if (removeIndex < cur) return cur - 1;
        if (removeIndex === cur) {
          const newIdx = Math.min(cur, nextQ.length - 1);
          const t = nextQ[newIdx];
          if (t) loadAndPlay(t);
          return newIdx;
        }
        return cur;
      });
      return nextQ;
    });
  }, [loadAndPlay]);

  const playAt = useCallback(
    (i: number) => {
      goTo(i);
    },
    [goTo]
  );

  const clearQueue = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setQueue([]);
    setIndex(-1);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const playShuffle = useCallback(
    (tracks: Track[]) => {
      if (tracks.length === 0) return;
      const shuffled = shuffleArray(tracks);
      setShuffle(true);
      setQueue(shuffled);
      setIndex(0);
      loadAndPlay(shuffled[0]!);
    },
    [loadAndPlay]
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
    const nextIdx = pickNextIndex(indexRef.current, queueRef.current);
    if (nextIdx != null) goTo(nextIdx);
  }, [goTo, pickNextIndex]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    const q = queueRef.current;
    const i = indexRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (shuffleRef.current && q.length > 1) {
      const prev = pickNextIndex(i, q);
      if (prev != null) goTo(prev);
      return;
    }
    if (i > 0) goTo(i - 1);
    else if (repeatRef.current === "all" && q.length > 0) goTo(q.length - 1);
    else if (audio) audio.currentTime = 0;
  }, [goTo, pickNextIndex]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s);
  }, []);

  const stop = useCallback(() => {
    clearQueue();
  }, [clearQueue]);

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

  const hasNext =
    queue.length > 1 ||
    (repeat === "all" && queue.length > 0) ||
    (shuffle && queue.length > 1) ||
    index + 1 < queue.length;

  return (
    <PlayerContext.Provider
      value={{
        track,
        queue,
        queueIndex: index,
        playing,
        currentTime,
        duration,
        repeat,
        shuffle,
        hasNext,
        hasPrevious:
          index > 0 ||
          (repeat === "all" && queue.length > 1) ||
          (shuffle && queue.length > 1),
        play,
        addToQueue,
        removeFromQueue,
        playAt,
        clearQueue,
        playShuffle,
        toggle,
        seek,
        next,
        previous,
        cycleRepeat,
        toggleShuffle,
        stop,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
