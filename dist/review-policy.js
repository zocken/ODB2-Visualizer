// Shared by browser and server: source names never constitute approval.
export function isReviewed(entry) {
  return entry.reviewStatus === 'approved' && Boolean(entry.reviewedBy?.trim()) &&
    Boolean(entry.reviewedAt) && Boolean(entry.contentHash) && entry.reviewedHash === entry.contentHash;
}
