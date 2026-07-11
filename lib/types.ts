// Shapes returned by the slskd REST API (v0), trimmed to the fields we use.

export interface SlskdFile {
  filename: string;
  size: number;
  extension?: string;
  bitRate?: number;
  bitDepth?: number;
  sampleRate?: number;
  length?: number; // seconds
  isVariableBitRate?: boolean;
}

export interface SearchResponse {
  username: string;
  fileCount: number;
  files: SlskdFile[];
  hasFreeUploadSlot: boolean;
  queueLength: number;
  uploadSpeed: number;
  lockedFileCount?: number;
}

export interface SearchState {
  id: string;
  searchText: string;
  state: string; // e.g. "InProgress", "Completed, TimedOut"
  isComplete: boolean;
  fileCount: number;
  responseCount: number;
  responses?: SearchResponse[];
}

export type TransferDirection = "Download" | "Upload";

export interface Transfer {
  id: string;
  username: string;
  direction: TransferDirection;
  filename: string;
  size: number;
  startOffset: number;
  state: string; // e.g. "Queued, Remotely", "InProgress", "Completed, Succeeded"
  bytesTransferred: number;
  averageSpeed: number;
  percentComplete: number;
  bytesRemaining: number;
  elapsedTime?: string;
  remainingTime?: string;
  enqueuedAt?: string;
  startedAt?: string;
  endedAt?: string;
  placeInQueue?: number;
}

export interface TransferDirectoryGroup {
  directory: string;
  fileCount: number;
  files: Transfer[];
}

export interface TransferUserGroup {
  username: string;
  directories: TransferDirectoryGroup[];
}

export interface ApplicationState {
  version?: {
    current?: string;
  };
  server?: {
    address?: string;
    state?: string;
    isConnected?: boolean;
    isLoggedIn?: boolean;
  };
  user?: {
    username?: string;
  };
  shares?: {
    directories?: number;
    files?: number;
  };
}

export interface Share {
  id: string;
  alias: string;
  localPath: string;
  remotePath: string;
  directories?: number;
  files?: number;
}

export interface ShareDirectory {
  name: string;
  fileCount?: number;
  files?: SlskdFile[];
}

// Normalised transfer status buckets for the queue UI.
export type TransferBucket =
  | "queued"
  | "initializing"
  | "inProgress"
  | "completed"
  | "errored";

export function bucketForState(state: string): TransferBucket {
  const s = state.toLowerCase();
  if (s.includes("inprogress")) return "inProgress";
  if (s.includes("queued") || s.includes("requested")) return "queued";
  if (s.includes("initializing")) return "initializing";
  if (s.includes("succeeded")) return "completed";
  if (s.includes("completed")) {
    // "Completed, Cancelled" / "Completed, Errored" / "Completed, TimedOut" etc.
    return s.includes("succeeded") ? "completed" : "errored";
  }
  return "errored";
}
