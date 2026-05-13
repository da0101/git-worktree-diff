export interface ThreadReply {
  id: string
  author: string        // 'You' or agent name
  message: string
  createdAt: number
}

export interface ReviewComment {
  id: string
  filePath: string
  startLine: number      // 0 for file-level comments (rejections)
  endLine: number        // 0 for file-level comments (rejections)
  lineType: 'new' | 'old'
  userComment: string
  targetAgent: string
  agentReply: string | null
  thread: ThreadReply[]   // full back-and-forth after initial exchange
  status: 'pending' | 'replied' | 'error'
  createdAt: number
}

export type FileReviewStatus = 'pending' | 'accepted' | 'rejected'

export interface ReviewState {
  fileStatuses: Map<string, FileReviewStatus>
  comments: ReviewComment[]
  selectedLines: { filePath: string; startIndex: number; endIndex: number } | null
}

export interface CommitResult {
  ok: boolean
  sha?: string
  error?: string
}

export interface PushResult {
  ok: boolean
  remote?: string
  branch?: string
  error?: string
}

export interface PrResult {
  ok: boolean
  url?: string
  error?: string
}
